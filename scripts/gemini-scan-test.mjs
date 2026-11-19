// ทดสอบว่า Gemini อ่านรหัสการ์ดจากรูปได้แม่นแค่ไหน แล้วเอารหัสไปหาใน TCGdex
// วิธีใช้:  $env:GEMINI_API_KEY="..."; node scripts/gemini-scan-test.mjs <โฟลเดอร์รูป>
// ไม่บันทึกคีย์ลงไฟล์ และไม่ส่งรูปไปที่อื่นนอกจาก Gemini
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, extname } from "node:path";

const KEY = process.env.GEMINI_API_KEY;
// ลองรุ่นตามลำดับ รุ่นไหนคนใช้เยอะ/ไม่ตอบ ค่อยข้ามไปรุ่นถัดไป (3.8-flash เคยขึ้น high demand)
const MODELS = process.env.GEMINI_MODEL ? [process.env.GEMINI_MODEL] : ["gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-3.7-flash"];
const dir = process.argv[2];
if (!KEY || !dir) {
  console.error('ต้องตั้ง GEMINI_API_KEY และระบุโฟลเดอร์รูป เช่น node scripts/gemini-scan-test.mjs C:\\cards');
  process.exit(1);
}

const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".heic": "image/heic" };

const PROMPT = `This is a photo of a Pokémon TCG card (Japanese, Thai or English print).
Read ONLY what is printed. Do not guess. If a field is unreadable, return null.
- set_code: the small set code near the bottom (e.g. "SV2a", "S12a", "CS4b", "SV8a")
- number: the collector number before the slash, keep leading zeros (e.g. "205", "034")
- total: the number after the slash, or null
- name: card name exactly as printed
- language: "ja" | "th" | "en" | null (judge from the printed text)
- confidence: 0 to 1, how sure you are about set_code + number`;

const schema = {
  type: "OBJECT",
  properties: {
    set_code: { type: "STRING", nullable: true },
    number: { type: "STRING", nullable: true },
    total: { type: "STRING", nullable: true },
    name: { type: "STRING", nullable: true },
    language: { type: "STRING", nullable: true },
    confidence: { type: "NUMBER" },
  },
  required: ["set_code", "number", "name", "language", "confidence"],
};

async function readCard(path, mime) {
  const data = (await readFile(path)).toString("base64");
  const errors = [];
  for (const model of MODELS) {
    try {
      return { model, ...(await readWith(model, data, mime)) };
    } catch (e) {
      errors.push(`${model}: ${e.message || e}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function readWith(MODEL, data, mime) {
  const t0 = Date.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": KEY },
    // กันค้าง: ใช้งานจริงลูกค้าไม่รอเกิน 20 วิ
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      contents: [{ parts: [{ inline_data: { mime_type: mime, data } }, { text: PROMPT }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: schema, temperature: 0 },
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || res.statusText);
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
  return { ...JSON.parse(text), ms: Date.now() - t0, tokens: json.usageMetadata?.totalTokenCount };
}

// ลองหาใน TCGdex ตามภาษาที่อ่านได้ก่อน ไม่เจอค่อยลองภาษาอื่น
async function findTcgdex(r) {
  if (!r.set_code || !r.number) return null;
  const langs = [r.language, "ja", "th", "en"].filter((l, i, a) => l && a.indexOf(l) === i);
  for (const lang of langs) {
    const res = await fetch(`https://api.tcgdex.net/v2/${lang}/sets/${encodeURIComponent(r.set_code)}/${encodeURIComponent(r.number)}`, { signal: AbortSignal.timeout(15000) }).catch(() => null);
    if (!res) continue;
    if (res.ok) {
      const c = await res.json();
      return { lang, id: c.id, name: c.name, set: c.set?.name };
    }
  }
  return null;
}

const files = (await readdir(dir)).filter((f) => MIME[extname(f).toLowerCase()]);
console.log(`ลองรุ่นตามลำดับ ${MODELS.join(" → ")} · ${files.length} รูป\n`);
const rows = [];
for (const f of files) {
  console.log(`กำลังอ่าน ${f} ...`);
  try {
    const r = await readCard(join(dir, f), MIME[extname(f).toLowerCase()]);
    const hit = await findTcgdex(r);
    rows.push({ file: f, ...r, tcgdex: hit ? `${hit.lang} ${hit.id} ${hit.name}` : "ไม่เจอ" });
    console.log(`${f}\n  [${r.model}] อ่านได้: ${r.set_code} ${r.number}/${r.total} · ${r.name} · ${r.language} · มั่นใจ ${r.confidence} · ${r.ms}ms · ${r.tokens} tokens\n  TCGdex: ${hit ? `${hit.lang} ${hit.id} ${hit.name} (${hit.set})` : "ไม่เจอ"}\n`);
  } catch (e) {
    rows.push({ file: f, error: String(e.message || e) });
    console.log(`${f}\n  ผิดพลาด: ${e.message || e}\n`);
  }
}
await writeFile(join(dir, "scan-test-result.json"), JSON.stringify(rows, null, 2));
console.log(`บันทึกผลไว้ที่ ${join(dir, "scan-test-result.json")}`);
