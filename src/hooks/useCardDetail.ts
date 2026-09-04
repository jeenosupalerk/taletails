import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export interface CardDetailRow {
  id: string;
  seller_id: string | null;
  name: string;
  details: string | null;
  images: string[];
  set_name: string | null;
  card_no: string | null;
  language: string | null;
  rarity: string | null;
  year: number | null;
  condition: string | null;
  grade: string | null;
  grading_company: string | null;
  certification_no: string | null;
  sale_type: "auction" | "fixed_price";
  price: number;
  status: "available" | "locked" | "sold";
  users?: { username: string | null; avatar_url: string | null } | null;
}

export interface AuctionRow {
  id: string;
  card_id: string;
  starting_price: number;
  current_price: number;
  bid_increment: number;
  bid_count: number;
  start_time: string;
  end_time: string;
  winner_id: string | null;
  status: "active" | "ended" | "waiting_payment" | "passed_to_next";
}

export interface BidRow {
  id: string;
  auction_id: string;
  user_id: string;
  amount: number;
  created_at: string;
  users?: { username: string | null; avatar_url: string | null } | null;
}

const CARD_COLUMNS =
  "id, seller_id, name, details, images, set_name, card_no, language, rarity, year, condition, grade, grading_company, certification_no, sale_type, price, status, users:seller_id (username, avatar_url)";

/** Current Supabase auth user id (client-side only). */
export function useAuthUserId() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return userId;
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ["card", cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(CARD_COLUMNS)
        .eq("id", cardId)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as CardDetailRow | null) ?? null;
    },
    staleTime: 10_000,
  });
}

export function useCardAuction(cardId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["auction", "by-card", cardId],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          "id, card_id, starting_price, current_price, bid_increment, bid_count, start_time, end_time, winner_id, status",
        )
        .eq("card_id", cardId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as AuctionRow | null) ?? null;
    },
    staleTime: 4_000,
    refetchInterval: 4_000,
  });
}

export function useBids(auctionId?: string) {
  return useQuery({
    queryKey: ["bids", auctionId],
    enabled: Boolean(auctionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, auction_id, user_id, amount, created_at, users:user_id (username, avatar_url)")
        .eq("auction_id", auctionId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data ?? []) as unknown as BidRow[];
    },
    staleTime: 3_000,
    refetchInterval: 4_000,
  });
}

/** Live price + bid feed updates without refreshing. */
export function useAuctionRealtime(auctionId?: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!auctionId) return;
    const channel = supabase
      .channel(`auction-${auctionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bids", filter: `auction_id=eq.${auctionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["bids", auctionId] });
          void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${auctionId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [auctionId, queryClient]);
}

export function usePlaceBid(auctionId?: string) {
  const queryClient = useQueryClient();
  const flushPush = useServerFn(flushPendingPush);
  return useMutation({
    mutationFn: async ({ amount, userId }: { amount: number; userId: string }) => {
      if (!auctionId) throw new Error("ไม่พบรอบประมูล");
      const { error } = await supabase
        .from("bids")
        .insert({ auction_id: auctionId, user_id: userId, amount });
      if (error) throw new Error(error.message);
      // ส่ง Push ให้ผู้ที่ถูกแซงทันที ไม่ต้องรอตัวตั้งเวลา
      void flushPush({}).catch(() => undefined);
      return amount;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bids", auctionId] });
      void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
    },
  });
}

export interface OrderRow {
  id: string;
  user_id: string;
  card_id: string;
  auction_id: string | null;
  total_amount: number;
  payment_method: "slip" | "qr_promptpay";
  slip_url: string | null;
  status: "pending" | "paid" | "shipped" | "cancelled";
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  note: string | null;
  payment_due_at: string;
  tracking_number: string | null;
  created_at: string;
}

/** Race-safe purchase: the database re-checks card status inside a locked row. */
export function useBuyNow() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (cardId: string) => {
      const { data, error } = await supabase.rpc("purchase_fixed_price_card", {
        _card_id: cardId,
        _payment_method: "slip",
      });
      if (error) throw new Error(error.message);
      return data as unknown as OrderRow;
    },
    onSuccess: (_o, cardId) => {
      void queryClient.invalidateQueries({ queryKey: ["card", cardId] });
      void queryClient.invalidateQueries({ queryKey: ["cards", "marketplace"] });
    },
  });
}

/** Winner-only order creation for a finished auction. */
export function useClaimAuctionWin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (auctionId: string) => {
      const { data, error } = await supabase.rpc("create_auction_order", {
        _auction_id: auctionId,
        _payment_method: "slip",
      });
      if (error) throw new Error(error.message);
      return data as unknown as OrderRow;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["auction", "by-card"] });
    },
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, user_id, card_id, auction_id, total_amount, payment_method, slip_url, status, shipping_name, shipping_phone, shipping_address, note, payment_due_at, tracking_number, created_at, cards:card_id (id, name, set_name, grade, images, price)",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as
        | (OrderRow & {
            cards: {
              id: string;
              name: string;
              set_name: string | null;
              grade: string | null;
              images: string[];
              price: number;
            } | null;
          })
        | null;
    },
  });
}

/** Uploads a slip into the private bucket under the user's own folder. */
export function useSubmitPayment(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      userId: string;
      file?: File | null;
      method: "slip" | "qr_promptpay";
      shipping: { name: string; phone: string; address: string; note?: string };
    }) => {
      let slipUrl: string | null = null;

      if (input.file) {
        const ext = input.file.name.split(".").pop() ?? "jpg";
        const path = `${input.userId}/${orderId}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("payment-slips")
          .upload(path, input.file, { upsert: true, contentType: input.file.type });
        if (upErr) throw new Error(upErr.message);
        slipUrl = path;
      }

      // Marking the order paid triggers the DB sync that flips the card to "sold".
      const { error } = await supabase
        .from("orders")
        .update({
          payment_method: input.method,
          slip_url: slipUrl,
          shipping_name: input.shipping.name,
          shipping_phone: input.shipping.phone,
          shipping_address: input.shipping.address,
          note: input.shipping.note ?? null,
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", orderId);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["card"] });
      void queryClient.invalidateQueries({ queryKey: ["cards", "marketplace"] });
    },
  });
}

