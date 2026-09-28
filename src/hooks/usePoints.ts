import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** 1 TT = 0.50 บาท, ทุก 25 บาทที่ชำระ = 1 TT */
export const TT_VALUE_THB = 0.5;
export const TT_EARN_PER_THB = 25;

export interface PointTransaction {
  id: string;
  user_id: string;
  order_id: string | null;
  kind: "earn" | "redeem" | "refund" | "release" | string;
  points: number;
  amount: number;
  description: string | null;
  created_at: string;
}

/** ยอดแต้มคงเหลือของผู้ใช้ */
export function usePointsBalance(userId: string | null) {
  return useQuery({
    queryKey: ["points", "balance", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("users")
        .select("tt_points")
        .eq("id", userId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return Number((data as { tt_points?: number } | null)?.tt_points ?? 0);
    },
  });
}

/** ประวัติการได้รับและใช้แต้ม */
export function usePointsHistory(userId: string | null) {
  return useQuery({
    queryKey: ["points", "history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("id, user_id, order_id, kind, points, amount, description, created_at")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as PointTransaction[];
    },
  });
}

/** ใช้แต้มเป็นส่วนลดกับคำสั่งซื้อ (ส่ง 0 เพื่อยกเลิกการใช้แต้ม) */
export function useRedeemPoints(orderId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (points: number) => {
      const { data, error } = await supabase.rpc("redeem_order_points" as never, {
        _order_id: orderId,
        _points: Math.max(0, Math.floor(points)),
      } as never);
      if (error) throw new Error(error.message);
      return data as unknown as { points_redeemed: number; points_discount: number };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["order", orderId] });
      void queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

/* ============================================================
 * TT Points v2 — ตั้งค่าจากหลังบ้าน + แลกของรางวัล (SQL: patches/2026-09-28_tt_points_v2.sql)
 * ตาราง tt_* ยังไม่อยู่ใน types ที่ generate ไว้ จึงต้อง cast ผ่าน never แบบเดียวกับ rpc ด้านบน
 * ============================================================ */

/** ค่าที่หน้าลูกค้าเห็น — ก่อนกดแปลงแต้ม ฟังก์ชันจะคืนกติกาเดิม (25 บาท / 0.50 บาท) ให้เอง */
export interface TtPublicSettings {
  baht_per_point: number;
  earn_on: "paid" | "completed";
  expiry_months: number;
  promo_name: string | null;
  promo_multiplier: number;
  promo_active: boolean;
  promo_ends_at: string | null;
  cash_redeem_active: boolean;
  cash_value_per_point: number;
  cash_max_pct: number;
  cash_redeem_until: string | null;
  v2_active: boolean;
}

const FALLBACK_SETTINGS: TtPublicSettings = {
  baht_per_point: TT_EARN_PER_THB,
  earn_on: "paid",
  expiry_months: 12,
  promo_name: null,
  promo_multiplier: 1,
  promo_active: false,
  promo_ends_at: null,
  cash_redeem_active: true,
  cash_value_per_point: TT_VALUE_THB,
  cash_max_pct: 100,
  cash_redeem_until: null,
  v2_active: false,
};

export function useTtSettings() {
  const query = useQuery({
    queryKey: ["tt", "settings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_tt_public_settings" as never);
      if (error) throw new Error(error.message);
      const row = (data as unknown as Record<string, unknown>[] | null)?.[0];
      if (!row) return FALLBACK_SETTINGS;
      return {
        ...FALLBACK_SETTINGS,
        ...row,
        baht_per_point: Number(row["baht_per_point"]),
        promo_multiplier: Number(row["promo_multiplier"]),
        cash_value_per_point: Number(row["cash_value_per_point"]),
        cash_max_pct: Number(row["cash_max_pct"]),
      } as TtPublicSettings;
    },
  });
  return { ...query, settings: query.data ?? FALLBACK_SETTINGS };
}

export interface TtReward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  fulfillment: "with_next_order" | "free_shipping_coupon";
  in_stock: boolean;
}

/** ของรางวัลที่เปิดอยู่ (ไม่มีต้นทุนติดมา) */
export function useTtRewards() {
  return useQuery({
    queryKey: ["tt", "rewards"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_tt_rewards" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TtReward[];
    },
  });
}

export interface TtRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  reward_name: string;
  points: number;
  status: "pending" | "attached" | "fulfilled" | "cancelled";
  order_id: string | null;
  created_at: string;
}

const REDEMPTION_COLS = "id, user_id, reward_id, reward_name, points, status, order_id, created_at";

export function useMyRedemptions(userId: string | null) {
  return useQuery({
    queryKey: ["tt", "redemptions", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tt_redemptions" as never)
        .select(REDEMPTION_COLS)
        .eq("user_id" as never, userId! as never)
        .order("created_at" as never, { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TtRedemption[];
    },
  });
}

export function useRedeemReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (rewardId: string) => {
      const { error } = await supabase.rpc("redeem_tt_reward" as never, { _reward_id: rewardId } as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["points"] });
      void queryClient.invalidateQueries({ queryKey: ["tt"] });
    },
  });
}

/* ---------- หลังบ้าน ---------- */

export interface TtAdminSettings {
  baht_per_point: number;
  earn_on: "paid" | "completed";
  expiry_months: number;
  target_cost_pct: number;
  promo_name: string | null;
  promo_multiplier: number;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
  cash_redeem_enabled: boolean;
  cash_value_per_point: number;
  cash_max_pct: number;
  cash_redeem_until: string | null;
  conversion_done_at: string | null;
}

const ADMIN_SETTING_COLS =
  "baht_per_point, earn_on, expiry_months, target_cost_pct, promo_name, promo_multiplier, promo_starts_at, promo_ends_at, cash_redeem_enabled, cash_value_per_point, cash_max_pct, cash_redeem_until, conversion_done_at";

export function useTtAdminSettings() {
  return useQuery({
    queryKey: ["tt", "admin-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tt_settings" as never)
        .select(ADMIN_SETTING_COLS)
        .eq("id" as never, 1 as never)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const r = (data ?? {}) as Record<string, unknown>;
      const num = (k: string) => Number(r[k] ?? 0);
      return {
        ...(r as unknown as TtAdminSettings),
        baht_per_point: num("baht_per_point"),
        expiry_months: num("expiry_months"),
        target_cost_pct: num("target_cost_pct"),
        promo_multiplier: num("promo_multiplier"),
        cash_value_per_point: num("cash_value_per_point"),
        cash_max_pct: num("cash_max_pct"),
      } as TtAdminSettings;
    },
  });
}

export function useSaveTtSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<TtAdminSettings, "conversion_done_at">>) => {
      const { error } = await supabase
        .from("tt_settings" as never)
        .update({ ...patch, updated_at: new Date().toISOString() } as never)
        .eq("id" as never, 1 as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tt"] }),
  });
}

export interface TtAdminReward {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  points_cost: number;
  unit_cost: number | null;
  fulfillment: "with_next_order" | "free_shipping_coupon";
  stock: number | null;
  is_active: boolean;
  sort_order: number;
}

export function useTtAdminRewards() {
  return useQuery({
    queryKey: ["tt", "admin-rewards"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tt_rewards" as never)
        .select("id, name, description, image_url, points_cost, unit_cost, fulfillment, stock, is_active, sort_order")
        .order("sort_order" as never)
        .order("points_cost" as never);
      if (error) throw new Error(error.message);
      return ((data ?? []) as unknown as TtAdminReward[]).map((r) => ({
        ...r,
        unit_cost: r.unit_cost === null ? null : Number(r.unit_cost),
      }));
    },
  });
}

export type TtRewardInput = Omit<TtAdminReward, "id"> & { id?: string | undefined };

export function useSaveTtReward() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...row }: TtRewardInput) => {
      const payload = { ...row, updated_at: new Date().toISOString() };
      const { error } = id
        ? await supabase.from("tt_rewards" as never).update(payload as never).eq("id" as never, id as never)
        : await supabase.from("tt_rewards" as never).insert(payload as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tt"] }),
  });
}

/** สรุปยอดแต้มเดิมก่อนแปลง (แอดมินอ่านตาราง users ได้ทั้งหมด) */
export function useTtConversionPreview(enabled: boolean) {
  return useQuery({
    queryKey: ["tt", "conversion-preview"],
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase.from("users").select("tt_points").gt("tt_points", 0);
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as { tt_points: number }[];
      return { members: rows.length, points: rows.reduce((s, r) => s + Number(r.tt_points ?? 0), 0) };
    },
  });
}

export function useConvertTtPoints() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("convert_tt_points_v2" as never);
      if (error) throw new Error(error.message);
      return Number(data ?? 0);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tt"] });
      void queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });
}

export interface TtAdminRedemption extends TtRedemption {
  users: { username: string | null; email: string | null } | null;
}

/** การแลกที่ยังไม่ส่ง — แอดมินแนบไปกับคำสั่งซื้อถัดไปของลูกค้า */
export function useTtAdminRedemptions() {
  return useQuery({
    queryKey: ["tt", "admin-redemptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tt_redemptions" as never)
        .select(`${REDEMPTION_COLS}, users:user_id (username, email)`)
        .in("status" as never, ["pending", "attached"] as never)
        .order("created_at" as never);
      if (error) throw new Error(error.message);
      return (data ?? []) as unknown as TtAdminRedemption[];
    },
  });
}

export function useSetRedemptionStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TtRedemption["status"] }) => {
      const { error } = await supabase
        .from("tt_redemptions" as never)
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq("id" as never, id as never);
      if (error) throw new Error(error.message);
      return true;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["tt"] }),
  });
}
