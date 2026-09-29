import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { compressImageFile } from "@/lib/image-compress";
import { flushPendingPush } from "@/lib/push.functions";
import { uid } from "@/lib/utils";

/*
 * ร้านค้า + รีวิว (patch 2026-09-28_shop_reviews)
 * ตาราง shop_profiles / reviews และฟังก์ชันใหม่ยังไม่อยู่ใน types ที่ generate ไว้ → cast เป็น never
 */

/** แท็กที่ลูกค้ากดเลือกตอนรีวิว — เรียงตามที่อยากให้เห็นก่อน */
export const REVIEW_TAGS = [
  "ตรงตามรูป",
  "แพ็คแน่นหนา",
  "ส่งไว",
  "สภาพดีกว่าที่คิด",
  "ตอบแชทไว",
] as const;
export const RATING_LABEL = ["", "แย่", "พอใช้", "โอเค", "ดี", "ดีมาก"] as const;

export interface ShopSummary {
  review_count: number;
  avg_rating: number | null;
  rating_counts: number[];
  tag_counts: Record<string, number>;
  sold_count: number;
}

export interface Review {
  id: string;
  order_id: string;
  card_id: string | null;
  seller_id: string;
  buyer_id: string;
  card_name: string;
  rating: number;
  tags: string[];
  comment: string | null;
  images: string[];
  seller_reply: string | null;
  seller_replied_at: string | null;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  buyer?: { username: string | null; avatar_url: string | null } | null;
}

const REVIEW_COLUMNS =
  "id, order_id, card_id, seller_id, buyer_id, card_name, rating, tags, comment, images, seller_reply, seller_replied_at, is_hidden, created_at, updated_at, buyer:buyer_id (username, avatar_url)";

export interface ShopProfile {
  user_id: string;
  shop_name: string;
  description: string | null;
}

/** ชื่อผู้รีวิวแบบย่อ เช่น "พิมพ์ชนก ศ." — ไม่โชว์ชื่อเต็มของลูกค้า */
export function maskName(name: string | null | undefined) {
  const n = (name ?? "").trim();
  if (!n) return "ลูกค้า";
  const [first, second] = n.split(/\s+/);
  if (second) return `${first} ${second.slice(0, 1)}.`;
  return first!.length > 6 ? `${first!.slice(0, 5)}…` : first!;
}

export function useShopSummary(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: ["shop", "summary", sellerId],
    enabled: !!sellerId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc(
        "get_shop_summary" as never,
        { _seller_id: sellerId } as never,
      );
      if (error) throw new Error(error.message);
      const row = ((data ?? []) as unknown as ShopSummary[])[0];
      return {
        review_count: row?.review_count ?? 0,
        avg_rating:
          row?.avg_rating === null || row?.avg_rating === undefined ? null : Number(row.avg_rating),
        rating_counts: row?.rating_counts ?? [0, 0, 0, 0, 0],
        tag_counts: row?.tag_counts ?? {},
        sold_count: row?.sold_count ?? 0,
      } satisfies ShopSummary;
    },
  });
}

export function useShopProfile(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["shop", "profile", userId],
    enabled: !!userId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_profiles" as never)
        .select("user_id, shop_name, description")
        .eq("user_id" as never, userId as never)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data ?? null) as unknown as ShopProfile | null;
    },
  });
}

export function useSaveShopProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ShopProfile) => {
      const { error } = await supabase
        .from("shop_profiles" as never)
        .upsert({ ...input, updated_at: new Date().toISOString() } as never, {
          onConflict: "user_id",
        });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: (_d, input) =>
      void queryClient.invalidateQueries({ queryKey: ["shop", "profile", input.user_id] }),
  });
}

/** รีวิวของร้าน (ผู้ขายเห็นรีวิวของตัวเองทั้งหมด รวมที่ถูกซ่อน) */
export function useShopReviews(sellerId: string | null | undefined, limit = 50) {
  return useQuery({
    queryKey: ["shop", "reviews", sellerId, limit],
    enabled: !!sellerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select(REVIEW_COLUMNS)
        .eq("seller_id" as never, sellerId as never)
        .order("created_at" as never, { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Review[];
    },
  });
}

export function useReplyReview() {
  const queryClient = useQueryClient();
  const flushPush = useServerFn(flushPendingPush);
  return useMutation({
    mutationFn: async ({ reviewId, reply }: { reviewId: string; reply: string }) => {
      const { error } = await supabase.rpc(
        "reply_review" as never,
        { _review_id: reviewId, _reply: reply } as never,
      );
      if (error) throw new Error(error.message);
      void flushPush().catch(() => undefined);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["shop", "reviews"] }),
  });
}

/** รีวิวที่ลูกค้าคนนี้เขียนไว้ — ใช้เช็กว่าคำสั่งซื้อไหนรีวิวแล้ว */
export function useMyReviews(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["reviews", "mine", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select(REVIEW_COLUMNS)
        .eq("buyer_id" as never, userId as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as Review[];
    },
  });
}

export interface ReviewInput {
  orderId: string;
  rating: number;
  tags: string[];
  comment: string;
  images: string[];
}

export function useSubmitReview() {
  const queryClient = useQueryClient();
  const flushPush = useServerFn(flushPendingPush);
  return useMutation({
    mutationFn: async (input: ReviewInput) => {
      const { error } = await supabase.rpc(
        "submit_review" as never,
        {
          _order_id: input.orderId,
          _rating: input.rating,
          _tags: input.tags,
          _comment: input.comment,
          _images: input.images,
        } as never,
      );
      if (error) throw new Error(error.message);
      void flushPush().catch(() => undefined);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
      void queryClient.invalidateQueries({ queryKey: ["tt"] });
      void queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

/** อัปโหลดรูปรีวิวเข้าโฟลเดอร์ของผู้ใช้เอง (RLS บังคับ) → คืน public URL */
export async function uploadReviewImage(userId: string, file: File): Promise<string> {
  const small = await compressImageFile(file, 1600);
  const ext = small.type === "image/png" ? "png" : small.type === "image/webp" ? "webp" : "jpg";
  const path = `${userId}/${uid()}.${ext}`;
  const { error } = await supabase.storage
    .from("review-images")
    .upload(path, small, { contentType: small.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("review-images").getPublicUrl(path).data.publicUrl;
}

/** รีวิวทั้งหมดสำหรับแอดมิน (รวมที่ถูกซ่อน) — กฎ "Admins manage reviews" */
export function useAdminReviews() {
  return useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .select(REVIEW_COLUMNS + ", seller:seller_id (username)")
        .order("created_at" as never, { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as (Review & {
        seller?: { username: string | null } | null;
      })[];
    },
  });
}

/** ซ่อน/แสดงรีวิวที่ผิดกติกา (ไม่ลบ — เก็บหลักฐานไว้) */
export function useSetReviewHidden() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ reviewId, hidden }: { reviewId: string; hidden: boolean }) => {
      const { data, error } = await supabase
        .from("reviews" as never)
        .update({ is_hidden: hidden, updated_at: new Date().toISOString() } as never)
        .eq("id" as never, reviewId as never)
        .select("id");
      if (error) throw new Error(error.message);
      if (!(data as unknown[] | null)?.length) throw new Error("ไม่มีสิทธิ์แก้ไขรีวิวนี้");
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "reviews"] });
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
    },
  });
}

/* ------------------------- คำสั่งซื้อของร้าน ------------------------- */

export interface SellerOrder {
  id: string;
  status: "pending" | "paid" | "shipped" | "cancelled" | "completed";
  total_amount: number;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  payment_due_at: string;
  paid_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  created_at: string;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    images: string[];
    seller_id: string;
  } | null;
}

/** คำสั่งซื้อของการ์ดที่ผู้ขายคนนี้ลง (RLS "Sellers can view orders of their cards") */
export function useSellerOrders(sellerId: string | null | undefined) {
  return useQuery({
    queryKey: ["shop", "orders", sellerId],
    enabled: !!sellerId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, status, total_amount, tracking_number, shipping_name, shipping_phone, shipping_address, payment_due_at, paid_at, shipped_at, received_at, created_at, cards:card_id!inner (id, name, set_name, images, seller_id)",
        )
        .eq("cards.seller_id", sellerId!)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as SellerOrder[];
    },
  });
}

export function useSellerShipOrder() {
  const queryClient = useQueryClient();
  const flushPush = useServerFn(flushPendingPush);
  return useMutation({
    mutationFn: async ({ orderId, tracking }: { orderId: string; tracking: string }) => {
      const { error } = await supabase.rpc(
        "seller_ship_order" as never,
        { _order_id: orderId, _tracking: tracking } as never,
      );
      if (error) throw new Error(error.message);
      void flushPush().catch(() => undefined);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["shop"] });
      void queryClient.invalidateQueries({ queryKey: ["admin"] });
    },
  });
}
