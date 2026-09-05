import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";
import { toast } from "sonner";

import { useBuyNow } from "@/hooks/useCardDetail";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * จองการ์ด (ล็อกไว้กันซื้อซ้ำ) แล้วพาไปหน้าชำระเงิน /checkout/$id
 * ถ้ามีคำสั่งซื้อที่รอชำระของการ์ดใบเดียวกันอยู่แล้ว จะพาไปรายการเดิม
 */
export function useStartCheckout() {
  const navigate = useNavigate();
  const requireAuth = useRequireAuth();
  const buyNow = useBuyNow();

  const goToExistingOrder = useCallback(
    async (cardId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const uid = sessionData.session?.user.id;
      if (!uid) return false;
      const { data: existing } = await supabase
        .from("orders")
        .select("id")
        .eq("card_id", cardId)
        .eq("user_id", uid)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!existing) return false;
      toast.info("คุณมีคำสั่งซื้อที่รอชำระสำหรับการ์ดใบนี้อยู่แล้ว");
      void navigate({ to: "/checkout/$id", params: { id: existing.id } });
      return true;
    },
    [navigate],
  );

  const start = useCallback(
    (cardId: string) => {
      if (!requireAuth("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")) return;
      buyNow.mutate(cardId, {
        onSuccess: (order) => {
          void navigate({ to: "/checkout/$id", params: { id: order.id } });
        },
        onError: (e) => {
          void goToExistingOrder(cardId).then((handled) => {
            if (!handled) toast.error(e.message);
          });
        },
      });
    },
    [buyNow, goToExistingOrder, navigate, requireAuth],
  );

  return { start, isPending: buyNow.isPending };
}
