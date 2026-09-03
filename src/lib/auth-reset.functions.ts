import { createServerFn } from "@tanstack/react-start";

/**
 * "ลืมรหัสผ่าน" flow — OTP based, no Supabase recovery e-mail required.
 *
 * 1. `requestPasswordResetOtp` stores a hashed 6-digit code in `public.email_otps`
 *    (purpose = "reset") and delivers it through Resend.
 * 2. `resetPasswordWithOtp` verifies the code and sets the new password with the
 *    Admin API, so the user can sign in immediately afterwards.
 */

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

function normalizeEmail(value: unknown) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("อีเมลไม่ถูกต้อง");
  return email;
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + ((buf[0] ?? 0) % 900000));
}

export const requestPasswordResetOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string }) => ({ email: normalizeEmail(input.email) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (!existing.data?.id) throw new Error("ไม่พบบัญชีที่ใช้อีเมลนี้");

    const recent = await supabaseAdmin
      .from("email_otps")
      .select("created_at")
      .eq("email", data.email)
      .eq("purpose", "reset")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (recent.data?.created_at) {
      const elapsed = (Date.now() - new Date(recent.data.created_at).getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        throw new Error(
          `กรุณารออีก ${Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed)} วินาที ก่อนขอรหัสใหม่`,
        );
      }
    }

    const code = randomCode();
    const inserted = await supabaseAdmin.from("email_otps").insert({
      email: data.email,
      code_hash: await sha256(code),
      purpose: "reset",
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (inserted.error) throw new Error("ไม่สามารถสร้างรหัสยืนยันได้ กรุณาลองใหม่");

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("ระบบส่งอีเมลยังไม่ได้ตั้งค่า");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env["RESEND_FROM"] ?? "Taletails <onboarding@resend.dev>",
        to: [data.email],
        subject: `รหัสตั้งรหัสผ่านใหม่ Taletails: ${code}`,
        html: `<div style="font-family:Prompt,Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="font-size:18px;margin:0 0 8px">ตั้งรหัสผ่านใหม่</h2>
          <p style="font-size:14px;color:#555;margin:0 0 20px">ใช้รหัสด้านล่างเพื่อตั้งรหัสผ่านใหม่ รหัสนี้ใช้ได้ ${OTP_TTL_MINUTES} นาที</p>
          <div style="font-size:34px;letter-spacing:10px;font-weight:700;text-align:center;padding:16px 0;background:#fff5ef;border-radius:14px;color:#e2560d">${code}</div>
          <p style="margin-top:24px;font-size:12px;color:#999">หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error("[reset] resend failed", res.status, body);
      if (res.status === 403) {
        throw new Error(
          "ระบบอีเมลยังใช้โหมดทดสอบ จึงส่งรหัสไปยังอีเมลนี้ไม่ได้ กรุณาตั้งค่าโดเมนผู้ส่งอีเมลก่อน",
        );
      }
      throw new Error("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }

    return { ok: true as const, email: data.email };
  });

export const resetPasswordWithOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string; password: string }) => ({
    email: normalizeEmail(input.email),
    code: String(input.code ?? "").replace(/\D/g, "").slice(0, 6),
    password: String(input.password ?? ""),
  }))
  .handler(async ({ data }) => {
    if (data.code.length !== 6) throw new Error("กรุณากรอกรหัสยืนยันให้ครบ 6 หลัก");
    if (data.password.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("email_otps")
      .select("id, code_hash, attempts, expires_at")
      .eq("email", data.email)
      .eq("purpose", "reset")
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) throw new Error("ไม่พบรหัสยืนยัน กรุณากดขอรหัสใหม่");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("รหัสยืนยันหมดอายุแล้ว กรุณากดขอรหัสใหม่");
    }
    if (row.attempts >= MAX_ATTEMPTS) throw new Error("กรอกรหัสผิดเกินกำหนด กรุณาขอรหัสใหม่");

    if ((await sha256(data.code)) !== row.code_hash) {
      await supabaseAdmin.from("email_otps").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      throw new Error("รหัสยืนยันไม่ถูกต้อง");
    }

    await supabaseAdmin
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const account = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();
    if (!account.data?.id) throw new Error("ไม่พบบัญชีที่ใช้อีเมลนี้");

    const updated = await supabaseAdmin.auth.admin.updateUserById(account.data.id, {
      password: data.password,
      email_confirm: true,
    });
    if (updated.error) throw new Error(updated.error.message);

    return { ok: true as const, email: data.email };
  });
