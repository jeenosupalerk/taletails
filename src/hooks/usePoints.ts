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
