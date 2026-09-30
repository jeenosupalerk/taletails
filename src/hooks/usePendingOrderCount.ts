import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/**
 * จำนวนคำสั่งซื้อที่ "รอชำระเงินและยังไม่หมดเวลา" ของผู้ใช้ — ใช้เป็นป้ายตัวเลขในเมนูบัญชี
 * นับเฉพาะที่ยังจ่ายได้ (payment_due_at ยังไม่ถึง) ตรงกับที่หน้า /orders ให้กดจ่าย
 */
export function usePendingOrderCount(userId: string | null) {
  return useQuery({
    queryKey: ["orders", "pending-count", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, payment_due_at")
        .eq("user_id", userId!)
        .eq("status", "pending");
      if (error) throw error;
      const now = Date.now();
      return (data ?? []).filter((o) => new Date(o.payment_due_at).getTime() > now).length;
    },
    staleTime: 15_000,
  });
}
