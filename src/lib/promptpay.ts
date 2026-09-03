/**
 * PromptPay QR (EMVCo / Thai QR Payment) payload builder.
 * Produces the exact string that banking apps expect to see encoded in the QR.
 */

const PROMPTPAY_ID =
  (import.meta.env['VITE_PROMPTPAY_ID'] as string | undefined)?.trim() || "0812345678";

const PROMPTPAY_NAME =
  (import.meta.env['VITE_PROMPTPAY_NAME'] as string | undefined)?.trim() || "TALETAILS";

function tag(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(input: string) {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i += 1) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Formats a phone / national-id / e-wallet id into the PromptPay target field. */
function targetTag(rawId: string) {
  const id = rawId.replace(/\D/g, "");

  if (id.length === 13) return tag("02", id); // national id
  if (id.length === 15) return tag("03", id); // e-wallet
  // phone number -> 0066 + number without the leading 0
  return tag("01", `0066${id.replace(/^0/, "")}`);
}

export interface PromptPayInfo {
  payload: string;
  displayId: string;
  displayName: string;
  amount: number;
}

export function buildPromptPayPayload(amount: number, id: string = PROMPTPAY_ID): PromptPayInfo {
  const merchant = tag("00", "A000000677010111") + targetTag(id);

  const body =
    tag("00", "01") +
    tag("01", amount > 0 ? "12" : "11") +
    tag("29", merchant) +
    tag("53", "764") +
    (amount > 0 ? tag("54", amount.toFixed(2)) : "") +
    tag("58", "TH") +
    tag("59", PROMPTPAY_NAME.slice(0, 25)) +
    tag("60", "BANGKOK");

  const withCrcTag = `${body}6304`;

  return {
    payload: `${withCrcTag}${crc16(withCrcTag)}`,
    displayId: id,
    displayName: PROMPTPAY_NAME,
    amount,
  };
}
