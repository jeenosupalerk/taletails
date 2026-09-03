import { createServerFn } from "@tanstack/react-start";

/**
 * Real e-mail OTP flow for Taletails.
 *
 * 1. `requestEmailOtp` generates a 6-digit code, stores only its SHA-256 hash in
 *    `public.email_otps` and delivers the code by e-mail through Resend.
 * 2. `verifyEmailOtp` checks the code and, when it matches, mints a one-time
 *    Supabase magic-link token. The browser exchanges that token with
 *    `supabase.auth.verifyOtp({ token_hash, type: "email" })`, which creates a
 *    real session and marks the e-mail as confirmed.
 */

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_SECONDS = 45;

type Purpose = "register" | "login";

interface RequestInput {
  email: string;
  purpose: Purpose;
  username?: string;
}

function normalizeEmail(value: unknown) {
  const email = String(value ?? "")
    .trim()
    .toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("อีเมลไม่ถูกต้อง");
  return email;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomCode() {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return String(100000 + ((buf[0] ?? 0) % 900000));
}

export const requestEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: RequestInput) => ({
    email: normalizeEmail(input.email),
    purpose: input.purpose === "register" ? ("register" as const) : ("login" as const),
    username: input.username ? String(input.username).slice(0, 80) : undefined,
  }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (data.purpose === "login" && !existing.data) {
      throw new Error("ไม่พบบัญชีที่ใช้อีเมลนี้ กรุณาสมัครสมาชิกก่อน");
    }

    // Simple cooldown so the endpoint can't be used to spam an inbox.
    const recent = await supabaseAdmin
      .from("email_otps")
      .select("created_at")
      .eq("email", data.email)
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
      purpose: data.purpose,
      pending_username: data.username ?? null,
      expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
    });
    if (inserted.error) throw new Error("ไม่สามารถสร้างรหัส OTP ได้ กรุณาลองใหม่");

    const apiKey = process.env["RESEND_API_KEY"];
    if (!apiKey) throw new Error("ระบบส่งอีเมลยังไม่ได้ตั้งค่า");

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env["RESEND_FROM"] ?? "Taletails <onboarding@resend.dev>",
        to: [data.email],
        subject: `รหัสยืนยัน Taletails: ${code}`,
        html: `<div style="font-family:Prompt,Helvetica,Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
          <h2 style="font-size:18px;margin:0 0 8px">รหัสยืนยันอีเมลของคุณ</h2>
          <p style="font-size:14px;color:#555;margin:0 0 20px">
            ใช้รหัสด้านล่างเพื่อ${data.purpose === "register" ? "ยืนยันการสมัครสมาชิก" : "เข้าสู่ระบบ"} Taletails
            รหัสนี้ใช้ได้ ${OTP_TTL_MINUTES} นาที
          </p>
          <div style="font-size:34px;letter-spacing:10px;font-weight:700;text-align:center;padding:16px 0;background:#fff5ef;border-radius:14px;color:#e2560d">${code}</div>
          <p style="margin-top:24px;font-size:12px;color:#999">หากคุณไม่ได้ร้องขอรหัสนี้ กรุณาเพิกเฉยต่ออีเมลฉบับนี้</p>
        </div>`,
      }),
    });

    if (!res.ok) {
      console.error("[otp] resend failed", res.status, await res.text());
      throw new Error("ส่งอีเมลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }

    return { ok: true as const, email: data.email };
  });

export const verifyEmailOtp = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string }) => ({
    email: normalizeEmail(input.email),
    code: String(input.code ?? "").replace(/\D/g, "").slice(0, 6),
  }))
  .handler(async ({ data }) => {
    if (data.code.length !== 6) throw new Error("กรุณากรอกรหัส OTP ให้ครบ 6 หลัก");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("email_otps")
      .select("id, code_hash, attempts, expires_at, consumed_at, pending_username")
      .eq("email", data.email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row) throw new Error("ไม่พบรหัส OTP กรุณากดขอรหัสใหม่");
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("รหัส OTP หมดอายุแล้ว กรุณากดขอรหัสใหม่");
    }
    if (row.attempts >= MAX_ATTEMPTS) {
      throw new Error("กรอกรหัสผิดเกินจำนวนที่กำหนด กรุณาขอรหัสใหม่");
    }

    if ((await sha256(data.code)) !== row.code_hash) {
      await supabaseAdmin
        .from("email_otps")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("รหัส OTP ไม่ถูกต้อง");
    }

    await supabaseAdmin
      .from("email_otps")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    const link = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: data.email,
    });

    const hashed = link.data?.properties?.hashed_token;
    if (link.error || !hashed) {
      console.error("[otp] generateLink failed", link.error?.message);
      throw new Error("ยืนยันสำเร็จ แต่สร้างเซสชันไม่ได้ กรุณาลองเข้าสู่ระบบอีกครั้ง");
    }

    if (row.pending_username) {
      await supabaseAdmin
        .from("users")
        .update({ username: row.pending_username })
        .eq("email", data.email);
    }

    return { tokenHash: hashed };
  });

/**
 * Creates the account server-side with the Admin API so Supabase's built-in
 * confirmation e-mail (which is heavily rate limited) is never triggered.
 * The e-mail is verified afterwards through our own Resend OTP.
 */
export const registerWithPassword = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string; username?: string; phone?: string }) => ({
    email: normalizeEmail(input.email),
    password: String(input.password ?? ""),
    username: input.username ? String(input.username).slice(0, 80) : undefined,
    phone: input.phone ? String(input.phone).slice(0, 40) : undefined,
  }))
  .handler(async ({ data }) => {
    if (data.password.length < 6) throw new Error("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const existing = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", data.email)
      .maybeSingle();

    if (existing.data) return { ok: true as const, created: false as const };

    const created = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        ...(data.username ? { username: data.username } : {}),
        ...(data.phone ? { phone: data.phone } : {}),
      },
    });

    if (created.error) {
      const message = created.error.message ?? "";
      if (/already been registered|already exists/i.test(message)) {
        return { ok: true as const, created: false as const };
      }
      console.error("[auth] createUser failed", message);
      throw new Error("สมัครสมาชิกไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }

    return { ok: true as const, created: true as const };
  });
