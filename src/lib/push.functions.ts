import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

interface SubscribeInput {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | undefined;
}

/** บันทึกอุปกรณ์ของผู้ใช้เพื่อรับการแจ้งเตือนแบบ Push */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubscribeInput) => {
    if (!input?.endpoint || !input.p256dh || !input.auth) {
      throw new Error("ข้อมูลการสมัครรับการแจ้งเตือนไม่ครบถ้วน");
    }
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("push_subscriptions").upsert(
      {
        user_id: context.userId,
        endpoint: data.endpoint,
        p256dh: data.p256dh,
        auth: data.auth,
        user_agent: data.userAgent ?? null,
      },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ยกเลิกการรับการแจ้งเตือนของอุปกรณ์นี้ */
export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => {
    if (!input?.endpoint) throw new Error("ไม่พบอุปกรณ์");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** ส่งการแจ้งเตือนทดสอบไปยังอุปกรณ์ของผู้ใช้เอง */
export const sendTestPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { sendPushToUser } = await import("./push.server");
    return sendPushToUser(context.userId, {
      title: "เปิดรับการแจ้งเตือนแล้ว",
      body: "Taletails จะแจ้งเตือนคุณเมื่อมีคนเสนอราคาสูงกว่า หรือมีอัปเดตคำสั่งซื้อ",
      link: "/profile",
      tag: "taletails-test",
    });
  });

/**
 * ส่งการแจ้งเตือนที่ยังค้างอยู่ออกเป็น Push ทันที
 * เรียกหลังผู้ใช้ทำรายการที่ทำให้เกิดการแจ้งเตือน (เช่น เคาะราคา)
 * เพื่อให้ผู้ที่ถูกแซงได้รับการแจ้งเตือนบนหน้าจอทันทีโดยไม่ต้องรอตัวตั้งเวลา
 */
export const flushPendingPush = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { dispatchPendingPush } = await import("./push.server");
    return dispatchPendingPush(20);
  });
