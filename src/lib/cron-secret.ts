/**
 * ตรวจสอบสิทธิ์ของตัวตั้งเวลา (cron) ด้วยรหัสลับของเจ้าของระบบเอง
 *
 * ตั้งค่า `CRON_SECRET` ใน environment ของเซิร์ฟเวอร์ แล้วส่งค่าเดียวกันมาที่
 * `Authorization: Bearer <CRON_SECRET>` หรือ `x-cron-secret: <CRON_SECRET>`
 * หรือ `?secret=<CRON_SECRET>`
 *
 * (ยังรองรับ LOVABLE_CRON_SECRET เดิมไว้ เพื่อไม่ให้ Preview ใน Lovable หยุดทำงาน)
 */
export function getCronSecret(): string | undefined {
  return process.env["CRON_SECRET"] ?? process.env["LOVABLE_CRON_SECRET"];
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** คืนค่า Response 401/500 เมื่อไม่ผ่าน หรือ null เมื่อผ่านการตรวจสอบ */
export function authenticateCronRequest(request: Request): Response | null {
  const secret = getCronSecret();
  if (!secret) return new Response("Cron secret is not configured", { status: 500 });

  const bearer = /^Bearer ([^\s,]+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const provided =
    bearer ??
    request.headers.get("x-cron-secret") ??
    new URL(request.url).searchParams.get("secret");

  if (!provided || !safeEqual(provided, secret)) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}
