import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export interface PushPayload {
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string | null;
}

function vapid() {
  return {
    subject: process.env["VAPID_SUBJECT"] ?? "mailto:admin@taletails.app",
    publicKey: process.env["VAPID_PUBLIC_KEY"],
    privateKey: process.env["VAPID_PRIVATE_KEY"],
  };
}

/** ส่ง Web Push ไปยังอุปกรณ์เดียว คืนค่า HTTP status ที่ push service ตอบกลับ */
export async function sendPushToSubscription(
  subscription: PushSubscription,
  payload: PushPayload,
): Promise<number> {
  const keys = vapid();
  if (!keys.publicKey || !keys.privateKey) {
    throw new Error("VAPID keys are not configured");
  }
  const built = await buildPushPayload(
    { data: payload, options: { ttl: 60 * 60 * 24, urgency: "high" } },
    subscription,
    keys,
  );
  const res = await fetch(subscription.endpoint, built);
  return res.status;
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * ส่งการแจ้งเตือนไปยังทุกอุปกรณ์ของผู้ใช้หนึ่งคน
 * และลบ subscription ที่หมดอายุ (404/410) ออกจากฐานข้อมูลอัตโนมัติ
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as SubscriptionRow[];
  let sent = 0;
  const stale: string[] = [];

  for (const row of rows) {
    try {
      const status = await sendPushToSubscription(
        {
          endpoint: row.endpoint,
          expirationTime: null,
          keys: { p256dh: row.p256dh, auth: row.auth },
        },
        payload,
      );
      if (status === 404 || status === 410) stale.push(row.id);
      else if (status >= 200 && status < 300) sent += 1;
    } catch (err) {
      console.error("push send failed", err);
    }
  }

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
  }

  return { devices: rows.length, sent, removed: stale.length };
}
