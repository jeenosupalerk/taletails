import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  createStripeClient,
  getStripeErrorMessage,
  isStripeEnabled,
  type StripeEnv,
} from "@/lib/stripe.server";

interface StartInput {
  orderId: string;
  shipping: { name: string; phone: string; address: string; note?: string };
}

const STRIPE_ENV: StripeEnv = "live";

/**
 * Creates a Stripe Checkout session that pays a TalTails order with PromptPay.
 * The order is only marked paid by the webhook once Stripe confirms the money arrived,
 * so the buyer never has to upload a slip for this path.
 */
export const startPromptPayPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: StartInput) => {
    if (!input?.orderId) throw new Error("orderId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    if (!isStripeEnabled()) {
      return {
        error:
          "ระบบชำระเงินอัตโนมัติยังไม่เปิดใช้งาน กรุณาโอนตามคิวอาร์โค้ดแล้วแนบสลิปเพื่อยืนยัน",
      };
    }

    const { data: order, error } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, points_discount, status, cards:card_id (name)")
      .eq("id", data.orderId)
      .maybeSingle();

    if (error) return { error: error.message };
    if (!order) return { error: "ไม่พบคำสั่งซื้อนี้" };
    if (order.user_id !== userId) return { error: "คำสั่งซื้อนี้ไม่ใช่ของคุณ" };
    if (order.status !== "pending") return { error: "คำสั่งซื้อนี้ชำระเงินหรือปิดไปแล้ว" };

    const payable = Math.max(
      0,
      Number(order.total_amount) - Number((order as { points_discount?: number }).points_discount ?? 0),
    );
    const amount = Math.round(payable * 100);
    if (!Number.isFinite(amount) || amount < 0) return { error: "ยอดชำระไม่ถูกต้อง" };

    const fullShipping = {
      shipping_name: data.shipping.name,
      shipping_phone: data.shipping.phone,
      shipping_address: data.shipping.address,
      note: data.shipping.note ?? null,
    };

    // ส่วนลดแต้มครอบคลุมยอดทั้งหมด (หรือน้อยกว่าขั้นต่ำที่ Stripe รับได้)
    // จึงบันทึกว่าชำระแล้วทันที ไม่ต้องส่งไป Stripe
    if (amount < 100) {
      const { error: paidError } = await supabase
        .from("orders")
        .update({
          ...fullShipping,
          payment_method: "stripe_promptpay",
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .eq("status", "pending");
      if (paidError) return { error: paidError.message };
      return { url: `/purchases/${order.id}?paid=1` };
    }

    await supabase
      .from("orders")
      .update({
        shipping_name: data.shipping.name,
        shipping_phone: data.shipping.phone,
        shipping_address: data.shipping.address,
        note: data.shipping.note ?? null,
        payment_method: "stripe_promptpay",
      })
      .eq("id", order.id);

    const origin =
      getRequestHeader("origin") ??
      (getRequestHeader("host") ? `https://${getRequestHeader("host")}` : "http://localhost:8080");

    const cardName =
      (order as unknown as { cards?: { name?: string } | null }).cards?.name ?? "การ์ดสะสม TaleTails";

    try {
      const stripe = createStripeClient(STRIPE_ENV);
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "thb",
              unit_amount: amount,
              product_data: { name: cardName },
            },
          },
        ],
        success_url: `${origin}/purchases/${order.id}?paid=1`,
        cancel_url: `${origin}/checkout/${order.id}`,
        client_reference_id: order.id,
        metadata: { orderId: order.id, userId },
        payment_intent_data: { metadata: { orderId: order.id, userId } },
      });

      if (!session.url) return { error: "ไม่สามารถเปิดหน้าชำระเงินได้" };

      await supabase
        .from("orders")
        .update({ stripe_session_id: session.id })
        .eq("id", order.id);

      return { url: session.url };
    } catch (e) {
      return { error: getStripeErrorMessage(e) };
    }
  });
