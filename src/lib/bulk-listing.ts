import type { NewCardInput } from "@/hooks/useAdmin";

/**
 * นำเข้าสินค้าหลายใบจากไฟล์ Excel (หลังบ้าน /admin/import)
 * ไฟล์นี้เป็นตรรกะล้วน: อ่านแถวจากตาราง → ตรวจ → จับคู่รูป → แปลงเป็นข้อมูลที่ useCreateCard ใช้
 * ชื่อคอลัมน์/ตัวเลือกต้องตรงกับไฟล์ตัวอย่าง public/templates/taletails-bulk-listing-template.xlsx
 */

export const TEMPLATE_URL = "/templates/taletails-bulk-listing-template.xlsx";
export const SHEET_NAME = "ลงสินค้า";
/** ครั้งละไม่เกินนี้ — อัปโหลดรูปจำนวนมากบนมือถือ/เน็ตช้าจะค้าง */
export const MAX_ROWS = 50;
export const MAX_IMAGES_PER_CARD = 8;

const REQUIRED_HEADERS = ["รหัส", "ประเภท", "ชื่อการ์ด", "ราคา"] as const;

/** ชื่อคอลัมน์ (ตัดข้อความในวงเล็บท้ายหัวคอลัมน์ออกก่อนเทียบ) → ชื่อฟิลด์ */
const HEADER_FIELDS = {
  รหัส: "code",
  ประเภท: "type",
  ชื่อการ์ด: "name",
  ชุด: "setName",
  เลขการ์ด: "cardNo",
  ภาษา: "language",
  ความหายาก: "rarity",
  ปี: "year",
  สภาพ: "condition",
  บริษัทเกรด: "gradingCompany",
  เกรด: "grade",
  เลขใบรับรอง: "certificationNo",
  รายละเอียด: "details",
  ราคา: "price",
  ขั้นเสนอราคา: "bidIncrement",
  เริ่มประมูล: "startTime",
  ปิดประมูล: "endTime",
  สต็อก: "stock",
  หมวดเกม: "category",
} as const;

type Field = (typeof HEADER_FIELDS)[keyof typeof HEADER_FIELDS];
const DATE_FIELDS: Field[] = ["startTime", "endTime"];

export type CellValue = string | number | boolean | Date | null;

/** ค่าดิบจากแถวใน Excel (ยังไม่ตรวจ) */
export interface RawRow {
  /** เลขแถวใน Excel (แถวหัวคอลัมน์ = 1) */
  line: number;
  values: Record<Field, string>;
}

/** ตัวอักษรกว้างศูนย์ (ติดมาตอนคัดลอกข้อความจากเว็บ/แชท) — สร้างจากรหัสเพื่อไม่ให้ตัวเครื่องมือแก้ไฟล์แปลงเป็นตัวอักษรจริง */
const ZERO_WIDTH = String.fromCharCode(0x200b);

const norm = (s: string) =>
  s.normalize("NFC").split(ZERO_WIDTH).join("").replace(/\s+/g, "").toLowerCase();

/** ตัดคำอธิบายในวงเล็บท้ายหัวคอลัมน์ เช่น "ราคา (ประมูล = ราคาเริ่มต้น)" → "ราคา" */
const headerKey = (cell: CellValue) => norm(String(cell ?? "").split(/[(（]/)[0] ?? "");

const pad2 = (n: number) => String(n).padStart(2, "0");

/** ปี พ.ศ. (> 2400) → ค.ศ. */
const fixYear = (y: number) => (y > 2400 ? y - 543 : y);

/** แปลงค่าเวลาเป็น "YYYY-MM-DDTHH:mm" (เวลาท้องถิ่นไทย) หรือ null ถ้าอ่านไม่ได้ */
export function parseDateTime(value: CellValue): string | null {
  if (value instanceof Date) {
    // เซลล์วันที่ของ Excel ไม่มีโซนเวลา ไลบรารีคืนเป็น UTC ของ "เวลาที่เห็นในช่อง" → ใช้ฟิลด์ UTC
    const y = fixYear(value.getUTCFullYear());
    return `${y}-${pad2(value.getUTCMonth() + 1)}-${pad2(value.getUTCDate())}T${pad2(value.getUTCHours())}:${pad2(value.getUTCMinutes())}`;
  }
  const s = String(value ?? "").trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/.exec(s);
  if (m) {
    return `${fixYear(+m[1]!)}-${pad2(+m[2]!)}-${pad2(+m[3]!)}T${pad2(+m[4]!)}:${m[5]}`;
  }
  // วัน/เดือน/ปี (แบบไทย) เช่น 5/10/2026 21:00 หรือ 5/10/2569 21:00
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})[ T](\d{1,2}):(\d{2})/.exec(s);
  if (m) {
    return `${fixYear(+m[3]!)}-${pad2(+m[2]!)}-${pad2(+m[1]!)}T${pad2(+m[4]!)}:${m[5]}`;
  }
  return null;
}

function cellText(value: CellValue, field: Field): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) {
    if (DATE_FIELDS.includes(field)) return parseDateTime(value) ?? "";
    return String(value.getUTCFullYear());
  }
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return String(value).trim();
}

/** อ่านตารางจากแถวของ Excel: หา "แถวหัวคอลัมน์" แล้วคืนแถวข้อมูล */
export function parseSheet(data: CellValue[][]): { rows: RawRow[]; problems: string[] } {
  const problems: string[] = [];
  const headerRow = data[0] ?? [];
  const colOf = new Map<Field, number>();
  headerRow.forEach((h, i) => {
    const key = headerKey(h);
    const entry = Object.entries(HEADER_FIELDS).find(([th]) => norm(th) === key);
    if (entry && !colOf.has(entry[1])) colOf.set(entry[1], i);
  });

  for (const h of REQUIRED_HEADERS) {
    if (!colOf.has(HEADER_FIELDS[h])) problems.push(`ไม่พบคอลัมน์ "${h}" ในแถวแรกของไฟล์`);
  }
  if (problems.length) return { rows: [], problems };

  const rows: RawRow[] = [];
  data.slice(1).forEach((r, i) => {
    const values = {} as Record<Field, string>;
    for (const field of Object.values(HEADER_FIELDS)) {
      const c = colOf.get(field);
      values[field] = c === undefined ? "" : cellText(r[c] ?? null, field);
    }
    if (Object.values(values).every((v) => !v)) return; // แถวว่าง
    // แถวตัวอย่างที่ผู้ใช้ลืมลบ (รหัสขึ้นต้นด้วย "ตัวอย่าง") ข้ามให้
    if (values.code.startsWith("ตัวอย่าง")) return;
    rows.push({ line: i + 2, values });
  });
  return { rows, problems };
}

export interface Category {
  id: string;
  name: string;
}

export interface ImageFileInfo {
  file: File;
  code: string;
  order: number;
}

const IMAGE_NAME = /^(.+?)(?:[_\-\s](\d{1,2}))?\.(jpe?g|png|webp)$/i;

/** แยกชื่อไฟล์รูปเป็น รหัส + ลำดับ เช่น A001_2.jpg → { code: "A001", order: 2 } (A001.jpg = ลำดับ 0) */
export function parseImageName(name: string): { code: string; order: number } | null {
  const m = IMAGE_NAME.exec(name.trim());
  if (!m) return null;
  return { code: m[1]!.trim(), order: m[2] ? Number(m[2]) : 0 };
}

export interface ImageIndex {
  byCode: Map<string, File[]>;
  /** ไฟล์ที่ชื่อไม่เข้ารูปแบบ หรือนามสกุลที่ยังไม่รองรับ */
  unsupported: string[];
  /** ชื่อไฟล์ → รหัส (ใช้หาไฟล์ที่ไม่ตรงกับแถวไหนเลย) */
  codeOfFile: Map<string, string>;
}

export function indexImages(files: File[]): ImageIndex {
  const parsed: ImageFileInfo[] = [];
  const unsupported: string[] = [];
  const codeOfFile = new Map<string, string>();
  for (const file of files) {
    const p = parseImageName(file.name);
    if (!p) {
      unsupported.push(file.name);
      continue;
    }
    parsed.push({ file, ...p });
    codeOfFile.set(file.name, norm(p.code));
  }
  parsed.sort((a, b) => a.order - b.order || a.file.name.localeCompare(b.file.name));
  const byCode = new Map<string, File[]>();
  for (const p of parsed) {
    const k = norm(p.code);
    byCode.set(k, [...(byCode.get(k) ?? []), p.file]);
  }
  return { byCode, unsupported, codeOfFile };
}

export interface CheckedRow {
  line: number;
  code: string;
  saleType: "fixed_price" | "auction" | null;
  name: string;
  priceNum: number;
  endTime: string;
  images: File[];
  errors: string[];
  warnings: string[];
  /** พร้อมส่งให้ useCreateCard (มีเฉพาะแถวที่ไม่มี error) */
  input: Omit<NewCardInput, "publish"> | null;
}

const SALE_TYPES: Record<string, "fixed_price" | "auction"> = {
  ขายทันที: "fixed_price",
  ขาย: "fixed_price",
  ราคาปกติ: "fixed_price",
  ราคาตายตัว: "fixed_price",
  fixed: "fixed_price",
  fixed_price: "fixed_price",
  ประมูล: "auction",
  auction: "auction",
};

const stripAccents = (s: string) => norm(s).normalize("NFD").replace(/[̀-ͯ]/g, "");

const toNumber = (s: string) => Number(s.replace(/,/g, "").trim());

export interface ValidateContext {
  categories: Category[];
  images: ImageIndex;
  /** เติมเวลาปิดให้ใบประมูลที่ไม่ได้ใส่: ใบแรกปิด base ใบถัดไปห่างกัน gapMinutes */
  fillEnd?: { base: string; gapMinutes: number } | undefined;
  now?: number;
}

export function validateRows(rows: RawRow[], ctx: ValidateContext): CheckedRow[] {
  const now = ctx.now ?? Date.now();
  const seen = new Map<string, number>();
  let filled = 0;

  return rows.map((raw) => {
    const v = raw.values;
    const errors: string[] = [];
    const warnings: string[] = [];

    // ---- รหัส
    const code = v.code.trim();
    if (!code) errors.push("ไม่มีรหัส (ใช้จับคู่กับชื่อไฟล์รูป)");
    else {
      const key = norm(code);
      const prev = seen.get(key);
      if (prev) errors.push(`รหัสซ้ำกับแถว ${prev}`);
      else seen.set(key, raw.line);
    }

    // ---- ประเภท
    const saleType = SALE_TYPES[norm(v.type)] ?? null;
    if (!v.type) errors.push("ไม่ได้ระบุประเภท (ขายทันที หรือ ประมูล)");
    else if (!saleType) errors.push(`ประเภท "${v.type}" ไม่ถูกต้อง ใช้ ขายทันที หรือ ประมูล`);

    // ---- ชื่อ
    if (!v.name) errors.push("ไม่มีชื่อการ์ด");

    // ---- ราคา
    const priceNum = toNumber(v.price);
    if (!v.price) errors.push("ไม่ได้ใส่ราคา");
    else if (!Number.isFinite(priceNum) || priceNum <= 0)
      errors.push(`ราคา "${v.price}" ต้องเป็นตัวเลขมากกว่า 0`);

    // ---- ปี
    if (v.year) {
      const y = Number(v.year);
      if (!Number.isInteger(y) || y < 1900 || y > 2100)
        errors.push(`ปี "${v.year}" ต้องเป็นปี ค.ศ. 4 หลัก`);
    }

    // ---- เกรด
    let grade = v.grade;
    let certificationNo = v.certificationNo;
    if (v.gradingCompany && !grade) errors.push("มีบริษัทเกรดแต่ไม่ได้ใส่เกรด");
    if (!v.gradingCompany && (grade || certificationNo)) {
      warnings.push("ไม่มีบริษัทเกรด จึงไม่บันทึกเกรด/เลขใบรับรอง");
      grade = "";
      certificationNo = "";
    }

    // ---- หมวดเกม
    let categoryId: string | undefined;
    if (v.category) {
      const hit = ctx.categories.find((c) => stripAccents(c.name) === stripAccents(v.category));
      if (hit) categoryId = hit.id;
      else
        errors.push(
          `ไม่พบหมวดเกม "${v.category}" (ที่มี: ${ctx.categories.map((c) => c.name).join(", ") || "-"})`,
        );
    }

    // ---- เฉพาะประเภท
    let endTime = "";
    let startTime = "";
    let bidIncrement = "";
    let stock = "";
    if (saleType === "auction") {
      bidIncrement = v.bidIncrement ? String(toNumber(v.bidIncrement)) : "50";
      const inc = Number(bidIncrement);
      if (!Number.isFinite(inc) || inc <= 0)
        errors.push(`ขั้นเสนอราคา "${v.bidIncrement}" ต้องเป็นตัวเลขมากกว่า 0`);

      if (v.endTime) {
        const parsed = parseDateTime(v.endTime);
        if (!parsed)
          errors.push(`เวลาปิดประมูล "${v.endTime}" อ่านไม่ได้ ใช้รูปแบบ 2026-10-05 21:00`);
        else endTime = parsed;
      } else if (ctx.fillEnd?.base) {
        const base = new Date(ctx.fillEnd.base).getTime();
        if (Number.isFinite(base)) {
          const t = new Date(base + filled * ctx.fillEnd.gapMinutes * 60_000);
          filled += 1;
          endTime = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}T${pad2(t.getHours())}:${pad2(t.getMinutes())}`;
          warnings.push("เวลาปิดตั้งให้อัตโนมัติ");
        }
      }
      if (!endTime && !errors.some((e) => e.startsWith("เวลาปิด")))
        errors.push("ใบประมูลต้องมีเวลาปิดประมูล");
      if (endTime && new Date(endTime).getTime() <= now + 60_000)
        errors.push("เวลาปิดประมูลต้องเป็นเวลาในอนาคต");

      if (v.startTime) {
        const parsed = parseDateTime(v.startTime);
        if (!parsed)
          errors.push(`เวลาเริ่มประมูล "${v.startTime}" อ่านไม่ได้ ใช้รูปแบบ 2026-10-05 18:00`);
        else {
          startTime = parsed;
          if (endTime && new Date(startTime).getTime() >= new Date(endTime).getTime())
            errors.push("เวลาเริ่มต้องมาก่อนเวลาปิด");
        }
      }
      if (v.stock) warnings.push("สต็อกใช้กับขายทันทีเท่านั้น (ละเว้นสำหรับใบประมูล)");
    } else if (saleType === "fixed_price") {
      if (v.stock) {
        const n = toNumber(v.stock);
        if (!Number.isInteger(n) || n < 1)
          errors.push(`สต็อก "${v.stock}" ต้องเป็นจำนวนเต็มตั้งแต่ 1`);
        else stock = String(n);
      } else stock = "1";
      if (v.endTime || v.startTime || v.bidIncrement)
        warnings.push("เวลา/ขั้นเสนอราคาใช้กับใบประมูลเท่านั้น (ละเว้นสำหรับขายทันที)");
    }

    // ---- รูป
    const images = code ? (ctx.images.byCode.get(norm(code)) ?? []) : [];
    if (images.length === 0) errors.push("ไม่พบรูปที่ตรงกับรหัสนี้ (ตั้งชื่อไฟล์เป็น รหัส_1.jpg)");
    if (images.length > MAX_IMAGES_PER_CARD) errors.push(`รูปเกิน ${MAX_IMAGES_PER_CARD} รูปต่อใบ`);

    const ok = errors.length === 0 && saleType !== null;
    const input: CheckedRow["input"] = ok
      ? {
          name: v.name,
          setName: v.setName,
          cardNo: v.cardNo,
          language: v.language,
          rarity: v.rarity,
          year: v.year,
          condition: v.condition,
          grade,
          gradingCompany: v.gradingCompany.toUpperCase(),
          certificationNo,
          details: v.details,
          saleType,
          price: String(priceNum),
          startingPrice: saleType === "auction" ? String(priceNum) : "",
          bidIncrement,
          endTime,
          ...(startTime ? { startTime } : {}),
          ...(categoryId ? { categoryId } : {}),
          stockQuantity: stock,
          files: images,
        }
      : null;

    return {
      line: raw.line,
      code,
      saleType,
      name: v.name,
      priceNum: Number.isFinite(priceNum) ? priceNum : 0,
      endTime,
      images,
      errors,
      warnings,
      input,
    };
  });
}

/** รหัสของไฟล์รูปที่ไม่ตรงกับแถวไหนในตาราง (ไว้เตือนว่าตั้งชื่อผิด) */
export function orphanImages(images: ImageIndex, rows: RawRow[]): string[] {
  const codes = new Set(rows.map((r) => norm(r.values.code)));
  const out: string[] = [];
  for (const [name, code] of images.codeOfFile) if (!codes.has(code)) out.push(name);
  return out;
}
