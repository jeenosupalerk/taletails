import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { flushPendingPush } from "@/lib/push.functions";
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
  updated_at: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  tracking_number: string | null;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    grade: string | null;
    images: string[];
  } | null;
  auctions: {
    id: string;
    status: string;
    winner_id: string | null;
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
          "id, auction_id, card_id, total_amount, status, payment_due_at, created_at, updated_at, paid_at, shipped_at, tracking_number, cards:cards!orders_card_id_fkey (id, name, set_name, grade, images), auctions:auctions!orders_auction_id_fkey (id, status, winner_id)",
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
      if (error) {
        if (isPermissionError(error)) return null;
        throw error;
      }
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
    queryFn: async (): Promise<PenaltyRow[]> => {
      const { data, error } = await supabase
        .from("auction_penalties")
        .select("id, strike_no, level, banned_until, is_permanent, reason, cleared_at, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) {
        if (isPermissionError(error)) return [];
        throw error;
      }
      return (data ?? []) as unknown as PenaltyRow[];
    },
    retry: 1,
    staleTime: 30_000,
  });
}

/** อัปเดตรายการที่ชนะทันทีเมื่อสถานะคำสั่งซื้อเปลี่ยน */
export function useWinsRealtime(userId: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;
    // ชื่อช่องต้องไม่ซ้ำกันระหว่างคอมโพเนนต์ (หน้า /wins, ตะกร้า และ AuctionWinWatcher ใช้ hook นี้พร้อมกัน)
    // ถ้าซ้ำ supabase จะคืนช่องเดิมที่ subscribe แล้ว และ .on() จะ throw จนหน้าพัง
    // ห่อด้วย try/catch เพื่อให้ปัญหา Realtime ไม่ทำให้หน้าแสดงผลไม่ได้ (ยังมี polling สำรองอยู่)
    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(`wins-${userId}-${Math.random().toString(36).slice(2)}`)
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
    } catch (err) {
      console.warn("[wins] realtime unavailable, falling back to polling", err);
      channel = null;
    }

    return () => {
      if (channel) void supabase.removeChannel(channel);
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
    ban_7_days: "ห้ามประมูล 7 วัน",
    ban_30_days: "ห้ามประมูล 30 วัน",
    account_suspended: "ระงับบัญชี • ต้องยืนยันตัวตน",
    ban_3_days: "ห้ามประมูล 3 วัน",
    ban_1_week: "ห้ามประมูล 1 สัปดาห์",
    ban_1_month: "ห้ามประมูล 1 เดือน",
    ban_permanent: "ห้ามประมูลถาวร",
  })[level] ?? level;

export interface WinTimelineEntry {
  at: string;
  label: string;
  detail?: string | undefined;
  tone: "muted" | "primary" | "success" | "danger";
}

export interface WinOutcome {
  label: string;
  className: string;
}

/** สรุปผลของแต่ละใบ: ชำระแล้ว / หมดเวลา / ถูกยกสิทธิ์ */
export function winOutcome(order: WonOrderRow, userId: string | null): WinOutcome {
  if (order.status === "paid") return { label: "ชำระแล้ว", className: "bg-emerald-500/15 text-emerald-600" };
  if (order.status === "shipped") return { label: "ชำระแล้ว • จัดส่งแล้ว", className: "bg-sky-500/15 text-sky-600" };
  if (order.status === "cancelled") {
    const passed = Boolean(
      order.auctions && userId && order.auctions.winner_id && order.auctions.winner_id !== userId,
    );
    return passed
      ? { label: "ถูกยกสิทธิ์ให้ผู้เสนอราคาถัดไป", className: "bg-amber-500/15 text-amber-600" }
      : { label: "หมดเวลาชำระเงิน", className: "bg-destructive/15 text-destructive" };
  }
  return { label: "รอชำระเงิน", className: "bg-primary/15 text-primary" };
}

const fmt = (iso: string) => new Date(iso).toLocaleString("th-TH");

/** ประวัติการชำระเงินของคำสั่งซื้อที่ได้จากการประมูล (เรียงจากเก่าไปใหม่) */
export function winTimeline(order: WonOrderRow, userId: string | null): WinTimelineEntry[] {
  const items: WinTimelineEntry[] = [
    { at: order.created_at, label: "ชนะการประมูล • ออกรายการชำระเงิน", tone: "primary" },
    { at: order.payment_due_at, label: "กำหนดชำระเงินภายใน", tone: "muted" },
  ];

  if (order.paid_at) {
    items.push({ at: order.paid_at, label: "ยืนยันการชำระเงินแล้ว", tone: "success" });
  }
  if (order.shipped_at) {
    items.push({
      at: order.shipped_at,
      label: "จัดส่งพัสดุแล้ว",
      detail: order.tracking_number ? `เลขพัสดุ ${order.tracking_number}` : undefined,
      tone: "success",
    });
  }
  if (order.status === "cancelled") {
    const outcome = winOutcome(order, userId);
    items.push({
      at: order.updated_at ?? order.payment_due_at,
      label: outcome.label,
      detail: "ไม่พบการชำระเงินภายในเวลาที่กำหนด",
      tone: "danger",
    });
  }

  return items
    .filter((i) => Boolean(i.at))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    ;
}

export const formatWinTime = fmt;
