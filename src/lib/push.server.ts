import { buildPushPayload, type PushSubscription } from "@block65/webcrypto-web-push";

export interface PushPayload {
  [key: string]: string | null | undefined;
  title: string;
  body?: string | null;
  link?: string | null;
  tag?: string | null;
}

function vapid() {
  const clean = (value: string | undefined) =>
    value
      ?.trim()
      .replace(/^["']|["']$/g, "")
      .replace(/\s+/g, "");
  return {
    subject: clean(process.env["VAPID_SUBJECT"]) ?? "mailto:admin@taletails.app",
    publicKey: clean(process.env["VAPID_PUBLIC_KEY"])?.replace(/=+$/, ""),
    privateKey: clean(process.env["VAPID_PRIVATE_KEY"])?.replace(/=+$/, ""),
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
  const res = await fetch(subscription.endpoint, {
    method: built.method,
    headers: built.headers as Record<string, string>,
    body: built.body.slice().buffer as ArrayBuffer,
  });
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
  let failed = 0;
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
      else failed += 1;
    } catch (err) {
      failed += 1;
      console.error("push send failed", err);
    }
  }

  if (stale.length) {
    await supabaseAdmin.from("push_subscriptions").delete().in("id", stale);
  }

  return { devices: rows.length, sent, removed: stale.length, failed };
}

/**
 * ส่งการแจ้งเตือนในระบบที่ยังไม่ได้ push ออกไปยังอุปกรณ์ของผู้ใช้
 * ถ้าผู้ใช้ยังไม่มีอุปกรณ์ที่ลงทะเบียนไว้ จะยังไม่ทำเครื่องหมายว่าส่งแล้ว
 * เพื่อให้ได้รับการแจ้งเตือนหลังจากเปิดรับบนอุปกรณ์
 */
export async function dispatchPendingPush(limit = 50) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // หยิบเฉพาะของผู้ที่มีอุปกรณ์รับ push และไม่เก่าเกิน 3 วัน
  // เดิมหยิบ "เก่าสุด N รายการ" รวมของคนที่ไม่มีอุปกรณ์ (ซึ่งจะค้างตลอดไป) — พอค้างเกิน N
  // รายการใหม่จะไม่ถูกหยิบมาส่งเลย (23 ก.ย. 2026: ค้าง 25 รายการ > flush ละ 20)
  // รายการที่ข้ามไปยังอยู่ในกล่องแจ้งเตือนบนเว็บตามเดิม แค่ไม่ส่ง push ที่ช้าเกินใช้ประโยชน์
  const { data: subs, error: subsError } = await supabaseAdmin.from("push_subscriptions").select("user_id");
  if (subsError) throw new Error(subsError.message);
  const userIds = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  if (userIds.length === 0) return { processed: 0, delivered: 0 };
  const since = new Date(Date.now() - 3 * 86_400_000).toISOString();

  const { data, error } = await supabaseAdmin
    .from("notifications")
    .select("id, user_id, title, body, link")
    .is("push_sent_at", null)
    .in("user_id", userIds)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  let delivered = 0;
  for (const row of rows) {
    try {
      const result = await sendPushToUser(row.user_id, {
        title: row.title,
        body: row.body,
        link: row.link,
        tag: row.id,
      });
      delivered += result.sent;
      if (result.devices === 0) continue;
      if (result.failed > 0) continue;
    } catch (err) {
      console.error("push dispatch failed", err);
      continue;
    }
    await supabaseAdmin
      .from("notifications")
      .update({ push_sent_at: new Date().toISOString() })
      .eq("id", row.id);
  }
  return { processed: rows.length, delivered };
}
