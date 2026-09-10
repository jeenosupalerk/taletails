import Stripe from 'stripe';

/**
 * Stripe แบบมาตรฐาน (ต่อกับ api.stripe.com โดยตรง) — ไม่พึ่งพาตัวกลางของ Lovable
 *
 * เปิดใช้งานเมื่อกำหนด environment ที่เซิร์ฟเวอร์:
 *   STRIPE_SECRET_KEY        คีย์ลับจากแดชบอร์ด Stripe (sk_test_... หรือ sk_live_...)
 *   STRIPE_WEBHOOK_SECRET    รหัสลับของ webhook endpoint (whsec_...)
 *
 * บน Lovable Preview จะใช้ค่าจาก Stripe connector โดยอัตโนมัติ:
 *   STRIPE_SANDBOX_API_KEY           (แทน STRIPE_SECRET_KEY)
 *   PAYMENTS_SANDBOX_WEBHOOK_SECRET  (แทน STRIPE_WEBHOOK_SECRET)
 *
 * หากไม่กำหนดค่าใด ระบบชำระผ่าน Stripe จะปิดอยู่ (ยังโอน + แนบสลิปได้ตามปกติ)
 */

/** คงชนิดเดิมไว้เพื่อความเข้ากันได้ของโค้ดที่เรียกใช้ */
export type StripeEnv = 'sandbox' | 'live';

/** คืนค่า Stripe secret key จากตัวแปรที่กำหนดไว้ (เซิร์ฟเวอร์หรือ connector) */
function getStripeSecretKey(): string | undefined {
  return process.env['STRIPE_SECRET_KEY'] ?? process.env['STRIPE_SANDBOX_API_KEY'];
}

export function isStripeEnabled(): boolean {
  return Boolean(getStripeSecretKey());
}

export function createStripeClient(_env: StripeEnv = 'live'): Stripe {
  const key = getStripeSecretKey();
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key, {
    apiVersion: '2026-03-25.dahlia',
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function getStripeErrorMessage(error: unknown): string {
  if (error && typeof error === 'object') {
    const stripeError = error as {
      message?: string;
      type?: string;
      code?: string;
      decline_code?: string;
      param?: string;
      requestId?: string;
      raw?: {
        message?: string;
        type?: string;
        code?: string;
        decline_code?: string;
        param?: string;
        requestId?: string;
      };
    };

    const message = stripeError.raw?.message ?? stripeError.message;
    if (message) {
      const details = [
        stripeError.raw?.type ?? stripeError.type,
        stripeError.raw?.code ?? stripeError.code,
        stripeError.raw?.decline_code ?? stripeError.decline_code,
        stripeError.raw?.param ?? stripeError.param,
        stripeError.raw?.requestId ?? stripeError.requestId,
      ].filter(Boolean);
      return details.length ? `${message} (${details.join(', ')})` : message;
    }
  }

  return 'Stripe request failed';
}

/** ตรวจลายเซ็น webhook ของ Stripe โดยไม่พึ่ง transport ของ SDK */
export async function verifyWebhook(
  req: Request,
  _env: StripeEnv = 'live',
): Promise<{ type: string; data: { object: any } }> {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();
  const secret =
    process.env['STRIPE_WEBHOOK_SECRET'] ??
    process.env['PAYMENTS_SANDBOX_WEBHOOK_SECRET'] ??
    '';
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured');

  if (!signature || !body) throw new Error('Missing signature or body');

  let timestamp: string | undefined;
  const v1Signatures: string[] = [];
  for (const part of signature.split(',')) {
    const [key, value] = part.split('=', 2);
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) v1Signatures.push(value);
  }
  if (!timestamp || v1Signatures.length === 0) throw new Error('Invalid signature format');

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 300) throw new Error('Webhook timestamp too old');

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${body}`));
  const expected = Buffer.from(new Uint8Array(signed)).toString('hex');
  if (!v1Signatures.includes(expected)) throw new Error('Invalid webhook signature');

  return JSON.parse(body);
}
