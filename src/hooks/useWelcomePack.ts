import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * ซองต้อนรับสมาชิกใหม่ (SQL: patches/2026-10-02_welcome_pack_points.sql)
 * แถว point_transactions.kind = 'welcome' คือตัวจำว่าเปิดซองแล้ว → เห็นอินโทรครั้งเดียวต่อบัญชี ทุกเครื่อง
 */
export function useWelcomePackStatus(userId: string | null) {
  return useQuery({
    queryKey: ["welcome-pack", userId],
    enabled: !!userId,
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("points")
        .eq("user_id", userId!)
        .eq("kind", "welcome")
        .maybeSingle();
      if (error) throw new Error(error.message);
      return { claimed: !!data, points: data ? Number(data.points) : null };
    },
  });
}

/** เปิดซอง: ฐานข้อมูลสุ่มแต้มและบันทึกให้ เรียกซ้ำได้ผลเดิม */
export function useClaimWelcomePack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_welcome_pack" as never);
      if (error) throw new Error(error.message);
      const res = data as unknown as { points: number; already: boolean };
      return { points: Number(res.points), already: !!res.already };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["points"] });
      void queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
