import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { compressImageFile } from "@/lib/image-compress";
import { flushPendingPush } from "@/lib/push.functions";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

/** True when the signed-in user holds the admin role (checked in the database). */
export function useIsAdmin() {
  const userId = useAuthUserId();
  const query = useQuery({
    queryKey: ["is-admin", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: userId!,
        _role: "admin",
      });
      if (error) throw error;
      return Boolean(data);
    },
  });
  return { userId, isAdmin: query.data === true, isLoading: !userId || query.isLoading };
}

/**
 * True when the signed-in user may run a shop ("ร้านของฉัน"):
 * an admin-approved seller role, or an admin.
 */
export function useIsSeller() {
  const userId = useAuthUserId();
  const query = useQuery({
    queryKey: ["is-seller", userId],
    enabled: Boolean(userId),
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId!);
      if (error) throw error;
      const roles = (data ?? []).map((r) => r.role);
      return {
        isSeller: roles.includes("seller") || roles.includes("admin"),
        isAdmin: roles.includes("admin"),
      };
    },
  });
  return {
    userId,
    isSeller: query.data?.isSeller === true,
    isAdmin: query.data?.isAdmin === true,
    isLoading: Boolean(userId) && query.isLoading,
  };
}

/* ------------------------------- cards ---------------------------------- */

export interface AdminCardRow {
  id: string;
  name: string;
  set_name: string | null;
  grade: string | null;
  condition: string | null;
  images: string[];
  price: number;
  sale_type: "auction" | "fixed_price";
  status: "available" | "locked" | "sold";
  created_at: string;
  auctions?: { id: string; end_time: string; current_price: number; status: string }[];
}

const CARD_SELECT =
  "id, name, set_name, grade, condition, images, price, sale_type, status, created_at, auctions (id, end_time, current_price, status)";

export function useAdminCards(enabled = true) {
  return useQuery({
    queryKey: ["admin", "cards"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(CARD_SELECT)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AdminCardRow[];
    },
  });
}

/** Cards belonging to the signed-in seller ("ร้านของฉัน"). */
export function useMyCards(enabled = true) {
  const userId = useAuthUserId();
  return useQuery({
    queryKey: ["shop", "cards", userId],
    enabled: enabled && Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(CARD_SELECT)
        .eq("seller_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AdminCardRow[];
    },
  });
}

export type ManagedRole = "seller" | "admin" | "customer";

/** Grants or revokes a role for a member (admin only). */
export function useToggleRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      role,
      granted,
    }: {
      userId: string;
      role: ManagedRole;
      granted: boolean;
    }) => {
      if (granted) {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
        if (error && !error.message.includes("duplicate")) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", role);
        if (error) throw new Error(error.message);
      }
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "member-roles"] });
      void queryClient.invalidateQueries({ queryKey: ["is-seller"] });
      void queryClient.invalidateQueries({ queryKey: ["is-admin"] });
    },
  });
}

/** Seller-role map for the member list. */
export function useSellerRoleMap() {
  return useQuery({
    queryKey: ["admin", "member-roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("user_roles").select("user_id, role");
      if (error) throw error;
      const map: Record<string, { seller: boolean; admin: boolean }> = {};
      for (const row of data ?? []) {
        const entry = (map[row.user_id] ??= { seller: false, admin: false });
        if (row.role === "seller") entry.seller = true;
        if (row.role === "admin") entry.admin = true;
      }
      return map;
    },
  });
}

export interface NewCardInput {
  name: string;
  setName: string;
  cardNo: string;
  language: string;
  rarity: string;
  year: string;
  condition: string;
  grade: string;
  gradingCompany: string;
  certificationNo: string;
  details: string;
  saleType: "auction" | "fixed_price";
  price: string;
  startingPrice: string;
  bidIncrement: string;
  endTime: string;
  files: File[];
}

/** Uploads images, creates the card and (optionally) opens its auction round. */
export function useCreateCard() {
  const queryClient = useQueryClient();
  const { userId } = useIsAdmin();

  return useMutation({
    mutationFn: async (input: NewCardInput) => {
      if (!userId) throw new Error("กรุณาเข้าสู่ระบบด้วยบัญชีผู้ดูแลระบบ");

      const images: string[] = [];
      for (const original of input.files) {
        const file = await compressImageFile(original);
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("card-images")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw new Error(upErr.message);
        const { data: signed, error: signErr } = await supabase.storage
          .from("card-images")
          .createSignedUrl(path, TEN_YEARS);
        if (signErr) throw new Error(signErr.message);
        images.push(signed.signedUrl);
      }

      const isAuction = input.saleType === "auction";
      const startPrice = Number(input.startingPrice || input.price || 0);

      const { data: card, error } = await supabase
        .from("cards")
        .insert({
          seller_id: userId,
          name: input.name,
          details: input.details || null,
          images,
          set_name: input.setName || null,
          card_no: input.cardNo || null,
          language: input.language || null,
          rarity: input.rarity || null,
          year: input.year ? Number(input.year) : null,
          condition: input.condition || null,
          grade: input.grade || null,
          grading_company: input.gradingCompany || null,
          certification_no: input.certificationNo || null,
          sale_type: input.saleType,
          price: isAuction ? startPrice : Number(input.price || 0),
          status: "available",
        })
        .select("id")
        .single();
      if (error) throw new Error(error.message);

      if (isAuction) {
        if (!input.endTime) throw new Error("กรุณาระบุวันเวลาปิดประมูล");
        const { error: aErr } = await supabase.from("auctions").insert({
          card_id: card.id,
          starting_price: startPrice,
          current_price: startPrice,
          bid_increment: Number(input.bidIncrement || 50),
          end_time: new Date(input.endTime).toISOString(),
          status: "active",
        });
        if (aErr) throw new Error(aErr.message);
      }

      return card.id as string;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
      void queryClient.invalidateQueries({ queryKey: ["cards", "marketplace"] });
      void queryClient.invalidateQueries({ queryKey: ["auctions"] });
    },
  });
}

export function useUpdateAuctionEndTime() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, endTime }: { auctionId: string; endTime: string }) => {
      const { error } = await supabase
        .from("auctions")
        .update({ end_time: new Date(endTime).toISOString(), status: "active" })
        .eq("id", auctionId);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
      void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
    },
  });
}

/** แอดมินเปิดประมูลการ์ดใบนั้นใหม่ (ล้างราคาและประวัติเสนอราคาของรอบเดิม) */
export function useRelistAuction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ auctionId, endTime }: { auctionId: string; endTime: string }) => {
      const { error } = await supabase.rpc("relist_auction", {
        _auction_id: auctionId,
        _end_time: new Date(endTime).toISOString(),
      });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
      void queryClient.invalidateQueries({ queryKey: ["auctions"] });
      void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase.rpc("admin_delete_card", { _card_id: cardId });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
      void queryClient.invalidateQueries({ queryKey: ["auctions"] });
      void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
    },
  });
}

/* ------------------------------- orders --------------------------------- */

export interface AdminOrderRow {
  id: string;
  user_id: string;
  card_id: string;
  auction_id: string | null;
  total_amount: number;
  payment_method: "slip" | "qr_promptpay";
  slip_url: string | null;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  status: "pending" | "paid" | "shipped" | "cancelled" | "completed";
  payment_due_at: string;
  received_at: string | null;
  created_at: string;
  cards?: { name: string; set_name: string | null; images: string[] } | null;
  users?: { username: string | null; email: string } | null;
}

export function useAdminOrders() {
  return useQuery({
    queryKey: ["admin", "orders"],
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, card_id, auction_id, total_amount, payment_method, slip_url, tracking_number, shipping_name, shipping_phone, shipping_address, status, payment_due_at, received_at, created_at, cards:card_id (name, set_name, images), users:user_id (username, email)",
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as AdminOrderRow[];
    },
  });
}

/** Creates a temporary signed link so admins can open a private payment slip. */
export function useSlipLink() {
  return useMutation({
    mutationFn: async (path: string) => {
      const { data, error } = await supabase.storage
        .from("payment-slips")
        .createSignedUrl(path, 600);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
  });
}

export function useAdminUpdateOrder() {
  const queryClient = useQueryClient();
  const flushPush = useServerFn(flushPendingPush);
  return useMutation({
    mutationFn: async (input: {
      orderId: string;
      status?: "paid" | "shipped" | "cancelled";
      trackingNumber?: string;
    }) => {
      const patch: {
        status?: "paid" | "shipped" | "cancelled";
        paid_at?: string;
        shipped_at?: string;
        tracking_number?: string;
      } = {};
      if (input.status) {
        patch.status = input.status;
        if (input.status === "paid") patch.paid_at = new Date().toISOString();
        if (input.status === "shipped") patch.shipped_at = new Date().toISOString();
      }
      if (input.trackingNumber !== undefined) patch.tracking_number = input.trackingNumber;

      const { error } = await supabase.from("orders").update(patch).eq("id", input.orderId);
      if (error) throw new Error(error.message);
      void flushPush().catch(() => undefined);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "orders"] });
      void queryClient.invalidateQueries({ queryKey: ["admin", "cards"] });
    },
  });
}

/* ------------------------------- members -------------------------------- */

export interface AdminMemberRow {
  id: string;
  email: string;
  username: string | null;
  phone: string | null;
  is_banned: boolean;
  auction_strikes: number;
  auction_banned_until: string | null;
  auction_ban_forever: boolean;
  created_at: string;
}

export function useAdminMembers() {
  return useQuery({
    queryKey: ["admin", "members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select(
          "id, email, username, phone, is_banned, auction_strikes, auction_banned_until, auction_ban_forever, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AdminMemberRow[];
    },
  });
}

export interface MemberBidRow {
  id: string;
  amount: number;
  created_at: string;
  auction_id: string;
  auctions?: { card_id: string; status: string; cards?: { name: string } | null } | null;
}

export function useMemberBids(userId?: string) {
  return useQuery({
    queryKey: ["admin", "member-bids", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, amount, created_at, auction_id, auctions:auction_id (card_id, status, cards:card_id (name))")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as MemberBidRow[];
    },
  });
}

export function useToggleBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = await supabase
        .from("users")
        .update({ is_banned: banned })
        .eq("id", userId);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["admin", "members"] }),
  });
}
