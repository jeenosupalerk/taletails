/**
 * รูปแชร์แนวนอน 1200×630 (mockup share-feature ข้อ 2) — สร้างจากข้อมูลการ์ดตอนมีคนขอรูป
 * แอปแชท/โซเชียลตัดรูปเป็นแนวนอน 1.91:1 รูปการ์ดแนวตั้งดิบ ๆ จึงโดนตัดหัวท้ายจนไม่เห็นเกรด/ราคา
 *
 * ใช้ satori (จัดหน้าเป็น SVG) + resvg-wasm (แปลง SVG เป็น PNG) — ไม่ใช้ไบนารีเฉพาะเครื่อง จึงรันบน Plesk ได้
 * ตัวอักษรให้ resvg เป็นคนวาด (embedFont: false) เพราะ satori วางสระบน/วรรณยุกต์ไทยผิดที่
 * (เช่น ไม้โทของ "สิ้น" ไปลอยอยู่บรรทัดอื่น) ส่วน resvg จัดวางแบบเดียวกับเบราว์เซอร์
 * ฟอนต์/ไฟล์ wasm โหลดจาก CDN ครั้งแรกแล้วเก็บในหน่วยความจำ (เวอร์ชันล็อกไว้ ไม่เปลี่ยนเอง)
 * ไฟล์นี้ใช้ฝั่งเซิร์ฟเวอร์เท่านั้น (import แบบ dynamic จาก route รูปแชร์)
 */
import { inflateSync } from "node:zlib";

import { initWasm, Resvg } from "@resvg/resvg-wasm";
import satori from "satori";

const FONT_CDN = "https://cdn.jsdelivr.net/npm/@fontsource/anuphan@5.3.0/files";
const WASM_URL = "https://cdn.jsdelivr.net/npm/@resvg/resvg-wasm@2.6.2/index_bg.wasm";

const C = {
  bg: "#f5f5f4",
  panel: "#e9e8e5",
  fg: "#161514",
  fg2: "#6f6c68",
  brand: "#f26a2e",
  line: "#dedcd8",
};

type FontDef = { name: string; data: ArrayBuffer; weight: 500 | 700; style: "normal" };

async function fetchBuf(url: string, timeoutMs = 10_000): Promise<ArrayBuffer> {
  const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) throw new Error(`โหลด ${url} ไม่สำเร็จ (${res.status})`);
  return res.arrayBuffer();
}

// ---------- แปลงฟอนต์ให้ resvg ----------
// resvg อ่าน WOFF ไม่ได้ และไฟล์ไทย/อังกฤษของ fontsource ใช้ชื่อ "Anuphan" ซ้ำกัน ทำให้เลือกความหนาผิดไฟล์
// จึงคลาย WOFF เป็น TTF แล้วเปลี่ยนชื่อในตาราง name เป็น AnuphanThai / AnuphanLatin

/** ตาราง name แบบย่อ (Windows, อังกฤษ-สหรัฐ) — มีแค่ชื่อที่ resvg ใช้เลือกฟอนต์ */
function nameTable(family: string, sub: string): Buffer {
  const recs: [number, string][] = [
    [1, family],
    [2, sub],
    [4, `${family} ${sub}`],
    [6, `${family}-${sub}`],
  ];
  const strs = recs.map(([, t]) => Buffer.from(t, "utf16le").swap16());
  const head = Buffer.alloc(6 + recs.length * 12);
  head.writeUInt16BE(0, 0);
  head.writeUInt16BE(recs.length, 2);
  head.writeUInt16BE(head.length, 4);
  let off = 0;
  recs.forEach(([id], i) => {
    const r = 6 + i * 12;
    head.writeUInt16BE(3, r);
    head.writeUInt16BE(1, r + 2);
    head.writeUInt16BE(0x409, r + 4);
    head.writeUInt16BE(id, r + 6);
    head.writeUInt16BE(strs[i]!.length, r + 8);
    head.writeUInt16BE(off, r + 10);
    off += strs[i]!.length;
  });
  return Buffer.concat([head, ...strs]);
}

/** WOFF 1.0 → TTF: คลายแต่ละตารางที่บีบด้วย zlib แล้วประกอบหัวไฟล์ใหม่ */
function woffToTtf(woffBuf: ArrayBuffer, family: string, sub: string): Uint8Array {
  const woff = Buffer.from(woffBuf);
  const flavor = woff.readUInt32BE(4);
  const n = woff.readUInt16BE(12);
  const tables: { tag: number; sum: number; data: Buffer }[] = [];
  for (let i = 0; i < n; i++) {
    const o = 44 + i * 20;
    const tag = woff.readUInt32BE(o);
    const off = woff.readUInt32BE(o + 4);
    const comp = woff.readUInt32BE(o + 8);
    const orig = woff.readUInt32BE(o + 12);
    const sum = woff.readUInt32BE(o + 16);
    const raw = woff.subarray(off, off + comp);
    let data: Buffer = comp < orig ? inflateSync(raw) : Buffer.from(raw);
    if (tag === 0x6e616d65 /* "name" */) data = nameTable(family, sub);
    tables.push({ tag, sum, data });
  }
  let es = 0;
  while (1 << (es + 1) <= n) es++;
  const sr = (1 << es) * 16;
  const head = Buffer.alloc(12 + n * 16);
  head.writeUInt32BE(flavor, 0);
  head.writeUInt16BE(n, 4);
  head.writeUInt16BE(sr, 6);
  head.writeUInt16BE(es, 8);
  head.writeUInt16BE(n * 16 - sr, 10);
  let off = head.length;
  const parts: Buffer[] = [head];
  tables.forEach((t, i) => {
    const r = 12 + i * 16;
    head.writeUInt32BE(t.tag, r);
    head.writeUInt32BE(t.sum, r + 4);
    head.writeUInt32BE(off, r + 8);
    head.writeUInt32BE(t.data.length, r + 12);
    const pad = (4 - (t.data.length % 4)) % 4;
    parts.push(t.data, Buffer.alloc(pad));
    off += t.data.length + pad;
  });
  return new Uint8Array(Buffer.concat(parts));
}

/**
 * resvg-wasm เปิดได้ครั้งเดียวต่อโปรเซส — เก็บสถานะไว้บน globalThis (รอดตอนโมดูลโหลดซ้ำ)
 * ถ้าโหลดฟอนต์ล้มเหลวแล้วลองใหม่ จะไม่เรียก initWasm ซ้ำจนพังถาวร
 */
const WASM_KEY = "__taletailsResvgWasm";
function ensureWasm(): Promise<void> {
  const g = globalThis as unknown as Record<string, Promise<void> | undefined>;
  if (!g[WASM_KEY]) {
    g[WASM_KEY] = (async () => {
      try {
        await initWasm(await fetchBuf(WASM_URL, 20_000));
      } catch (e) {
        if (e instanceof Error && /already initialized/i.test(e.message)) return;
        g[WASM_KEY] = undefined;
        throw e;
      }
    })();
  }
  return g[WASM_KEY]!;
}

type Assets = { fonts: FontDef[]; ttfs: Uint8Array[] };
let assets: Promise<Assets> | null = null;
/** โหลดครั้งเดียวต่อการเปิดเซิร์ฟเวอร์ — ล้มเหลวให้ลองใหม่รอบหน้า ไม่ค้างค่า error ไว้ */
function loadAssets(): Promise<Assets> {
  if (!assets) {
    assets = (async () => {
      await ensureWasm();
      // ไทยกับอังกฤษอยู่คนละไฟล์ — ต้องตั้งชื่อต่างกัน satori ถึงจะหยิบไฟล์อีกตัวมาใช้กับตัวอักษรที่ขาด
      const subsets = [
        ["AnuphanLatin", "latin"],
        ["AnuphanThai", "thai"],
      ] as const;
      const jobs = subsets.flatMap(([name, sub]) =>
        ([500, 700] as const).map(async (weight) => ({
          name,
          weight,
          style: "normal" as const,
          data: await fetchBuf(`${FONT_CDN}/anuphan-${sub}-${weight}-normal.woff`),
        })),
      );
      const fonts = await Promise.all(jobs);
      const ttfs = fonts.map((f) =>
        woffToTtf(f.data, f.name, f.weight === 700 ? "Bold" : "Medium"),
      );
      return { fonts, ttfs };
    })().catch((e: unknown) => {
      assets = null;
      throw e;
    });
  }
  return assets;
}

/** ดึงรูปการ์ดมาเป็น data URL (satori ต้องมีข้อมูลรูปในมือ) — ใหญ่เกิน/โหลดไม่ได้ = ไม่มีรูป */
async function imageDataUrl(url: string | null): Promise<string | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > 8 * 1024 * 1024) return null;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export type OgCard = {
  name: string;
  setName: string | null;
  grade: string;
  kind: "fixed_price" | "auction";
  /** ขายตายตัว: ราคา · ประมูล: ไม่ใช้ (ราคาเปลี่ยนตลอด แอปเก็บรูปค้าง เลยใช้เวลาจบแทน) */
  price: number;
  /** ประมูล: เวลาจบแบบอ่านได้ เช่น "15 ต.ค. · 21:00 น." */
  endLabel: string | null;
  /** ขายแล้ว / ประมูลจบแล้ว → ขึ้นแถบบอก ไม่ให้ลิงก์เก่าหลอกว่ายังซื้อได้ */
  closedLabel: string | null;
  image: string | null;
};

const thb = (n: number) => `฿${Math.round(n).toLocaleString("en-US")}`;

// ---------- ตัดบรรทัดเอง ----------
// satori ตัดบรรทัดภาษาไทยแล้ววรรณยุกต์ไปค้างท้ายบรรทัดก่อน (เช่น "สิ้น" ขึ้นบรรทัดใหม่แต่ ้ อยู่บรรทัดบน)
// จึงแบ่งคำไทยเอง (Intl.Segmenter) แล้วส่งทีละบรรทัดแบบห้ามตัด — ความกว้างเป็นค่าประมาณที่เผื่อไว้แล้ว
const THAI_MARK = /[ัิ-ฺ็-๎]/;
function charWidthEm(ch: string): number {
  if (THAI_MARK.test(ch)) return 0;
  if (ch === " ") return 0.26;
  if (/[฀-๿]/.test(ch)) return 0.6;
  if (/[A-Z0-9#@%&$฿]/.test(ch)) return 0.66;
  if (/[a-z]/.test(ch)) return 0.55;
  return 0.4;
}
const widthEm = (t: string) => [...t].reduce((w, ch) => w + charWidthEm(ch), 0);

function wrapLines(text: string, maxEm: number, maxLines: number): string[] {
  const words = [...new Intl.Segmenter("th", { granularity: "word" }).segment(text)].map(
    (s) => s.segment,
  );
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if (widthEm(cur + w) <= maxEm || cur === "") {
      cur += w;
      continue;
    }
    lines.push(cur.trimEnd());
    cur = w.trimStart();
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  if (lines.length <= maxLines) return lines;
  // เกินจำนวนบรรทัด: ตัดบรรทัดสุดท้ายทีละคำจนใส่ "…" ได้
  const kept = lines.slice(0, maxLines);
  const segs = [
    ...new Intl.Segmenter("th", { granularity: "word" }).segment(kept[maxLines - 1]!),
  ].map((s) => s.segment);
  let last = segs.join("");
  while (segs.length > 1 && widthEm(`${last}…`) > maxEm) {
    segs.pop();
    last = segs.join("").trimEnd();
  }
  kept[maxLines - 1] = `${last}…`;
  return kept;
}

/** โลโก้ตัวอักษร "Taletails" — แยกเป็น 2 ชิ้นชิดกัน (satori 0.32 เว้นช่องเกินถ้าเป็นข้อความต่อ span) */
function Logo() {
  return (
    <>
      <span>Tale</span>
      <span style={{ color: C.brand, marginLeft: -1 }}>tails</span>
    </>
  );
}

function Layout({ card, img }: { card: OgCard; img: string | null }) {
  const isAuction = card.kind === "auction";
  const closed = Boolean(card.closedLabel);
  // ชื่อชุดซ้ำกับชื่อการ์ด (เช่นกล่องบูสเตอร์) ไม่ต้องขึ้นซ้ำ
  const setName =
    card.setName &&
    card.setName !== "-" &&
    card.setName.trim().toLowerCase() !== card.name.trim().toLowerCase()
      ? card.setName
      : null;
  // พื้นที่ข้อความกว้าง 610px — ชื่อยาวลดขนาดตัวอักษรก่อน แล้วค่อยตัดเป็น 2 บรรทัด
  const nameSize = widthEm(card.name) * 62 > 610 * 1.4 ? 52 : 62;
  const nameLines = wrapLines(card.name, 610 / nameSize, 2);
  const setMaxEm = (card.grade ? 610 - 40 - widthEm(card.grade) * 30 - 32 : 610) / 32;
  const setLine = setName ? wrapLines(setName, setMaxEm, 1)[0]! : null;

  return (
    <div
      style={{
        width: 1200,
        height: 630,
        display: "flex",
        background: C.bg,
        fontFamily: "AnuphanLatin, AnuphanThai",
        color: C.fg,
      }}
    >
      {/* รูปการ์ด */}
      <div
        style={{
          width: 470,
          height: 630,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: C.panel,
          position: "relative",
        }}
      >
        {img ? (
          <img
            src={img}
            width={390}
            height={546}
            style={{ objectFit: "contain", opacity: closed ? 0.55 : 1 }}
          />
        ) : closed ? null : (
          <div
            style={{
              display: "flex",
              fontSize: 54,
              fontWeight: 700,
              color: C.fg2,
            }}
          >
            <Logo />
          </div>
        )}
        {closed && (
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 270,
              height: 90,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(22,21,20,0.86)",
              color: "#fff",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            {card.closedLabel}
          </div>
        )}
      </div>

      {/* ข้อมูล */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "52px 60px 48px 60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
            <Logo />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 26,
              fontWeight: 700,
              padding: "8px 20px",
              borderRadius: 999,
              background: isAuction ? C.brand : C.fg,
              color: "#fff",
            }}
          >
            {isAuction ? "ประมูล" : "ขายตายตัว"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {nameLines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 700,
                lineHeight: 1.25,
                whiteSpace: "nowrap",
              }}
            >
              {line}
            </div>
          ))}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 18 }}>
            {card.grade ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 30,
                  fontWeight: 700,
                  padding: "4px 16px",
                  borderRadius: 10,
                  background: C.fg,
                  color: "#fff",
                }}
              >
                {card.grade}
              </div>
            ) : null}
            {setName ? (
              <div
                style={{
                  display: "flex",
                  fontSize: 32,
                  fontWeight: 500,
                  color: C.fg2,
                  whiteSpace: "nowrap",
                }}
              >
                {setLine}
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 500, color: C.fg2 }}>
            {isAuction ? (closed ? "สถานะ" : "ประมูลสิ้นสุด") : closed ? "ราคาที่ขาย" : "ราคา"}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: isAuction ? 60 : 84,
              fontWeight: 700,
              lineHeight: 1.15,
            }}
          >
            {isAuction
              ? closed
                ? card.closedLabel
                : (card.endLabel ?? "เปิดอยู่ตอนนี้")
              : thb(card.price)}
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 22,
              paddingTop: 18,
              borderTop: `2px solid ${C.line}`,
              fontSize: 26,
              fontWeight: 500,
              color: C.fg2,
            }}
          >
            taletails-trade.com
          </div>
        </div>
      </div>
    </div>
  );
}

/** สร้าง PNG — รูปการ์ดถอดรหัสไม่ได้ (เช่นชนิดไฟล์ที่ไม่รองรับ) ให้ลองใหม่แบบไม่มีรูป */
const THAI_CHAR = /[ก-ฺเ-๎]/;
// ช่วงตัวอักษรไทยติดกัน (รวมวรรณยุกต์) สลับกับช่วงที่ไม่ใช่ไทย
const THAI_RUN = /[ก-ฺเ-๎]+|[^ก-ฺเ-๎]+/g;
const familyFor = (t: string) =>
  THAI_CHAR.test(t) ? "AnuphanThai, AnuphanLatin" : "AnuphanLatin, AnuphanThai";

export async function renderOgPng(card: OgCard): Promise<Uint8Array> {
  const { fonts, ttfs } = await loadAssets();
  const draw = async (img: string | null) => {
    const raw = await satori(<Layout card={card} img={img} />, {
      width: 1200,
      height: 630,
      fonts,
      embedFont: false,
    });
    // satori แยกข้อความเป็นทีละคำ — แบ่งแต่ละคำเป็นช่วงไทย/ไม่ใช่ไทย แล้วให้แต่ละช่วงใช้ฟอนต์ของตัวเอง
    // (คำปน เช่น "นิมเฟียEX" ถ้าใช้ฟอนต์เดียว ตัวที่ไปยืมฟอนต์สำรองจะได้ความหนาผิด)
    const svg = raw.replace(
      /(<text[^>]*?)font-family="[^"]*"([^>]*>)([^<]*)</g,
      (_m, a: string, b: string, t: string) => {
        const runs = t.match(THAI_RUN) ?? [t];
        if (runs.length === 1) return `${a}font-family="${familyFor(t)}"${b}${t}<`;
        const spans = runs.map((r) => `<tspan font-family="${familyFor(r)}">${r}</tspan>`).join("");
        return `${a}font-family="AnuphanLatin"${b}${spans}<`;
      },
    );
    return new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: { fontBuffers: ttfs, defaultFontFamily: "AnuphanLatin", loadSystemFonts: false },
    })
      .render()
      .asPng();
  };
  const img = await imageDataUrl(card.image);
  if (!img) return draw(null);
  try {
    return await draw(img);
  } catch {
    return draw(null);
  }
}
