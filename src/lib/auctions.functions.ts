import { createServerFn } from "@tanstack/react-start";

/**
 * ปิดรอบประมูลที่หมดเวลาและยกเลิกรายการที่เลยกำหนดชำระเงิน
 * รันด้วยสิทธิ์ระบบ (service role) เพราะฟังก์ชันฐานข้อมูลเหล่านี้ไม่เปิดให้ผู้ใช้เรียกโดยตรง
 */
export const processAuctions = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const closed = await supabaseAdmin.rpc("close_expired_auctions");
  const expired = await supabaseAdmin.rpc("expire_unpaid_orders");

  return {
    auctionsClosed: closed.error ? 0 : (closed.data ?? 0),
    ordersExpired: expired.error ? 0 : (expired.data ?? 0),
  };
});
