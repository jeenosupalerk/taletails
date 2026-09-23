/**
 * ราคาตลาด (Market Price) — ใช้ร่วมกันระหว่างการ์ดสินค้า หน้าสถิติ และค้นหา
 *
 * - "การ์ดรุ่นเดียวกัน" = ชื่อ + ชุด + เกรด (+ บริษัทเกรด ถ้าข้อมูลยอดขายมีให้)
 *   เพราะการ์ด 1 แถวในระบบคือของชิ้นเดียว ขายได้ครั้งเดียว จะนับประวัติรายใบไม่ได้
 * - ราคาตลาด = ค่าเฉลี่ยของ 3 ครั้งล่าสุดที่ขายได้ภายใน 90 วัน
 */

export const MARKET_PRICE_SAMPLES = 3;
export const MARKET_PRICE_WINDOW_DAYS = 90;
const DAY = 86_400_000;

/** บริษัทเกรดที่รู้จัก — ใช้ตัดออกจากข้อความเกรดเพื่อให้ "PSA 10" กับ "10" เทียบกันได้ */
const COMPANIES = ["SQC", "PSA", "BGS", "BECKETT", "CGC", "SGC", "ACE", "TAG", "PCA", "AGS", "HGA", "ARS"];

const clean = (v?: string | null) => {
  const s = (v ?? "").trim();
  return ["", "-", "—"].includes(s) ? "" : s;
};

/**
 * ทำข้อความให้เทียบกันได้: ตัวพิมพ์เล็ก และถือว่าเว้นวรรค/ขีด/จุด/วงเล็บเป็นตัวคั่นเดียวกัน
 * เช่น "Moltres-V" = "moltres v" = "Moltres  V"
 */
export const normText = (v?: string | null) =>
  clean(v)
    .toLowerCase()
    .replace(/[\s\-_–—.,'’·:()]+/g, " ")
    .trim();

/** คีย์หลวมสำหรับจับชื่อ "เกือบเหมือน" (ตัดตัวคั่นทั้งหมดออก) เช่น "moltresv" */
export const looseKey = (v?: string | null) => normText(v).replace(/\s+/g, "");

const norm = normText;

/** แยกเกรดเป็น { company, value } เช่น "PSA 10" → { PSA, 10 } */
export function splitGrade(grade?: string | null, company?: string | null, condition?: string | null) {
  let g = clean(grade) || clean(condition);
  let co = clean(company).toUpperCase();
  // ข้อมูลบางแถวกรอกบริษัทเป็นตัวเลขผิดช่อง เช่น "01" — ไม่นับเป็นบริษัท
  if (co && !/[A-Z]/.test(co)) co = "";
  const upper = g.toUpperCase();
  const prefix = COMPANIES.find((c) => upper.startsWith(c + " ") || upper === c);
  if (prefix) {
    co = co || prefix;
    g = g.slice(prefix.length).trim();
  }
  if (/^raw\b/i.test(g)) g = "Raw";
  return { company: co, value: g };
}

/**
 * คีย์ "การ์ดรุ่นเดียวกัน"
 * @param withCompany ใส่บริษัทเกรดในคีย์ด้วยหรือไม่ — ต้องตรงกันทั้งฝั่งยอดขายและฝั่งสินค้า
 */
export function cardKey(
  input: {
    name: string;
    set?: string | null;
    grade?: string | null;
    company?: string | null;
    condition?: string | null;
  },
  withCompany: boolean,
) {
  const { company, value } = splitGrade(input.grade, input.company, input.condition);
  // เกรดว่างถือเป็น Raw เสมอ ให้ "Raw" กับช่องว่างเทียบกันได้
  const g = norm(value) || "raw";
  const withCo = withCompany && company && g !== "raw" ? `${company.toLowerCase()} ${g}` : g;
  return [norm(input.name), norm(input.set), withCo].join("|");
}

/** ข้อความเกรดสำหรับแสดงผล เช่น "PSA 10", "BGS 9.5", "Raw", "Near Mint" */
export function gradeDisplay(grade?: string | null, company?: string | null, condition?: string | null) {
  const { company: co, value } = splitGrade(grade, company, condition);
  if (!value) return co || "";
  if (value === "Raw") return "Raw";
  return co ? `${co} ${value}` : value;
}

export interface SalePoint {
  price: number;
  soldAt: number; // epoch ms
  isAuction: boolean;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** ราคาตลาดจากรายการขาย (เรียงอย่างไรก็ได้) — null ถ้าไม่มีการขายใน 90 วัน */
export function marketPriceOf(sales: SalePoint[], now = Date.now()): number | null {
  const recent = sales
    .filter((s) => now - s.soldAt <= MARKET_PRICE_WINDOW_DAYS * DAY)
    .sort((a, b) => b.soldAt - a.soldAt)
    .slice(0, MARKET_PRICE_SAMPLES);
  return recent.length ? Math.round(avg(recent.map((s) => s.price))) : null;
}

/**
 * % เปลี่ยนแปลงของราคาในช่วงเวลา: เฉลี่ยราคาที่ขายในช่วงนี้ เทียบกับ
 * เฉลี่ย 3 ครั้งล่าสุดก่อนเริ่มช่วง — null ถ้าข้อมูลไม่พอเทียบ
 */
export function changeInWindow(sales: SalePoint[], days: number | null, now = Date.now()): number | null {
  if (days === null) {
    // ทั้งหมด: ครั้งล่าสุดเทียบครั้งแรก
    const ordered = [...sales].sort((a, b) => a.soldAt - b.soldAt);
    if (ordered.length < 2) return null;
    const first = ordered[0]!.price;
    const last = ordered[ordered.length - 1]!.price;
    return first ? ((last - first) / first) * 100 : null;
  }
  const start = now - days * DAY;
  const inWin = sales.filter((s) => s.soldAt >= start);
  const before = sales
    .filter((s) => s.soldAt < start)
    .sort((a, b) => b.soldAt - a.soldAt)
    .slice(0, MARKET_PRICE_SAMPLES);
  if (!inWin.length || !before.length) return null;
  const base = avg(before.map((s) => s.price));
  return base ? ((avg(inWin.map((s) => s.price)) - base) / base) * 100 : null;
}

/** ราคาที่ตั้งขายเทียบราคาตลาด (%) — ลบ = ถูกกว่าตลาด */
export function diffVsMarket(price: number, marketPrice: number | null | undefined): number | null {
  if (!marketPrice || !price) return null;
  return ((price - marketPrice) / marketPrice) * 100;
}

export type StatRange = "24h" | "7d" | "30d" | "all";
export const STAT_RANGES: { key: StatRange; label: string; days: number | null }[] = [
  { key: "24h", label: "24 ชม.", days: 1 },
  { key: "7d", label: "7 วัน", days: 7 },
  { key: "30d", label: "30 วัน", days: 30 },
  { key: "all", label: "ทั้งหมด", days: null },
];
export const rangeDaysOf = (r: StatRange) => STAT_RANGES.find((x) => x.key === r)?.days ?? null;

const rtf = new Intl.RelativeTimeFormat("th-TH", { numeric: "auto" });
/** "12 นาทีที่แล้ว", "เมื่อวาน" */
export function timeAgo(ms: number, now = Date.now()) {
  const diff = Math.round((ms - now) / 1000);
  const abs = Math.abs(diff);
  if (abs < 60) return "เมื่อสักครู่";
  if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
  if (abs < 30 * 86400) return rtf.format(Math.round(diff / 86400), "day");
  return rtf.format(Math.round(diff / (30 * 86400)), "month");
}
