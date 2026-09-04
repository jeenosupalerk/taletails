import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { isPermissionError } from "@/lib/query-guards";

export interface WonOrderRow {
  id: string;
  auction_id: string | null;
  card_id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "cancelled";
  payment_due_at: string;
  created_at: string;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    grade: string | null;
    images: string[];
  } | null;
}

/** คำสั่งซื้อทั้งหมดที่เกิดจากการชนะประมูล (RLS จำกัดให้เห็นของตัวเองเท่านั้น) */
export function useAuctionWins() {
  const userId = useAuthUserId();

  return useQuery({
    queryKey: ["auction-wins", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<WonOrderRow[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, auction_id, card_id, total_amount, status, payment_due_at, created_at, cards:cards!orders_card_id_fkey (id, name, set_name, grade, images)",
        )
        .eq("user_id", userId!)
        .not("auction_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) {
        if (isPermissionError(error)) return [];
        throw error;
      }
      return (data ?? []) as unknown as WonOrderRow[];
    },
    retry: 1,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}

export interface AuctionBanStatus {
  strikes: number;
  bannedUntil: string | null;
  isPermanent: boolean;
  isBanned: boolean;
}

/** สถานะบทลงโทษการประมูลของผู้ใช้ที่ล็อกอินอยู่ */
export function useAuctionBanStatus() {
  const userId = useAuthUserId();

  return useQuery({
    queryKey: ["auction-ban", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<AuctionBanStatus | null> => {
      const { data, error } = await supabase
        .from("users")
        .select("auction_strikes, auction_banned_until, auction_ban_forever")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const until = data.auction_banned_until;
      return {
        strikes: data.auction_strikes ?? 0,
        bannedUntil: until,
        isPermanent: Boolean(data.auction_ban_forever),
        isBanned:
          Boolean(data.auction_ban_forever) || (!!until && new Date(until).getTime() > Date.now()),
      };
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

export interface PenaltyRow {
  id: string;
  strike_no: number;
  level: string;
  banned_until: string | null;
  is_permanent: boolean;
  reason: string | null;
  cleared_at: string | null;
  created_at: string;
}

export function useMyPenalties() {
  const userId = useAuthUserId();

  return useQuery({
    queryKey: ["auction-penalties", userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auction_penalties")
        .select("id, strike_no, level, banned_until, is_permanent, reason, cleared_at, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as PenaltyRow[];
    },
    staleTime: 30_000,
  });
}

/** อัปเดตรายการที่ชนะทันทีเมื่อสถานะคำสั่งซื้อเปลี่ยน */
export function useWinsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`wins-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `user_id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["auction-wins"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "users", filter: `id=eq.${userId}` },
        () => {
          void queryClient.invalidateQueries({ queryKey: ["auction-ban"] });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

/** แอดมินยกเลิกการห้ามประมูลของสมาชิก */
export function useClearAuctionBan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("clear_auction_ban", {
        _user_id: userId,
        _reset_strikes: true,
      });
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin", "members"] });
      void queryClient.invalidateQueries({ queryKey: ["auction-ban"] });
    },
  });
}

export const penaltyLabel = (level: string) =>
  ({
    warning: "คำเตือนครั้งที่ 1",
    ban_3_days: "ห้ามประมูล 3 วัน",
    ban_1_week: "ห้ามประมูล 1 สัปดาห์",
    ban_1_month: "ห้ามประมูล 1 เดือน",
    ban_permanent: "ห้ามประมูลถาวร",
  })[level] ?? level;
