import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { verifyWebhook, type StripeEnv } from "@/lib/stripe.server";

let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    _supabase = createClient(process.env['SUPABASE_URL']!, process.env['SUPABASE_SERVICE_ROLE_KEY']!);
  }
  return _supabase;
}

/** Marks the order paid once Stripe confirms the PromptPay transfer settled. */
async function fulfillOrder(session: any) {
  const orderId: string | undefined = session?.metadata?.orderId ?? session?.client_reference_id;
  if (!orderId) {
    console.error("payments webhook: session without orderId");
    return;
  }

  const supabase = getSupabase();
  const { data: order } = await supabase
    .from("orders")
    .select("id, user_id, status")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) return;
  if ((order as { status?: string }).status !== "pending") return;

  const { error } = await supabase
    .from("orders")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      payment_method: "stripe_promptpay",
      stripe_session_id: session.id ?? null,
      stripe_payment_intent_id:
        typeof session.payment_intent === "string" ? session.payment_intent : null,
    })
    .eq("id", orderId)
    .eq("status", "pending");

  if (error) {
    console.error("payments webhook: failed to mark order paid", error.message);
    return;
  }

  const userId = (order as { user_id?: string }).user_id;
  if (userId) {
    await supabase.rpc("notify_user", {
      _user_id: userId,
      _type: "order",
      _title: "ได้รับการชำระเงินแล้ว",
      _body: "ระบบตรวจพบเงินเข้าเรียบร้อย คำสั่งซื้อของคุณกำลังเตรียมจัดส่ง",
      _link: `/purchases/${orderId}`,
    });
    try {
      const { dispatchPendingPush } = await import("@/lib/push.server");
      await dispatchPendingPush(20);
    } catch (err) {
      console.error("payments webhook: push dispatch failed", err);
    }
  }
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      if (session.payment_status !== "unpaid") await fulfillOrder(session);
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await fulfillOrder(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      console.log("payments webhook: async payment failed", event.data.object?.id);
      break;
    default:
      console.log("payments webhook: unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // env query param is optional — defaults to "live".
        // Stripe Dashboard webhook URL can be set with or without ?env=live
        const rawEnv = new URL(request.url).searchParams.get("env") ?? "live";
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("payments webhook: invalid env parameter", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (e) {
          console.error("payments webhook error:", e);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
