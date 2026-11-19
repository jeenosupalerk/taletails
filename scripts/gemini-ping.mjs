// เช็กสั้น ๆ ว่าคีย์ Gemini คุยกับ Google ได้ไหม และรุ่นไหนตอบเร็ว (ไม่ส่งรูป)
// วิธีใช้: node scripts/gemini-ping.mjs
const KEY = process.env.GEMINI_API_KEY;
if (!KEY) { console.error("ยังไม่ได้ตั้ง GEMINI_API_KEY"); process.exit(1); }
const BASE = "https://generativelanguage.googleapis.com/v1beta";
const H = { "Content-Type": "application/json", "x-goog-api-key": KEY };

async function timed(label, p) {
  const t0 = Date.now();
  try { const r = await p; console.log(`${label}: ${r} · ${Date.now() - t0}ms`); }
  catch (e) { console.log(`${label}: ผิดพลาด ${e.message || e} · ${Date.now() - t0}ms`); }
}

// 1) ขอรายชื่อรุ่น: ถ้าข้อนี้ยังค้าง แปลว่าเน็ตหรือคีย์มีปัญหา ไม่ใช่ตัวรุ่น
await timed("รายชื่อรุ่น", (async () => {
  const res = await fetch(`${BASE}/models?pageSize=200`, { headers: H, signal: AbortSignal.timeout(20000) });
  const j = await res.json();
  if (!res.ok) throw new Error(j.error?.message || res.status);
  const names = (j.models || []).filter((m) => m.supportedGenerationMethods?.includes("generateContent")).map((m) => m.name.replace("models/", ""));
  return names.filter((n) => /flash|lite/.test(n)).join(", ") || "(ไม่มีรุ่น flash)";
})());

// 2) ส่งข้อความสั้นไปแต่ละรุ่น ดูว่ารุ่นไหนตอบไว
for (const model of (process.argv[2] ? process.argv.slice(2) : ["gemini-3.8-flash", "gemini-3.8-flash-lite"])) {
  await timed(model, (async () => {
    const res = await fetch(`${BASE}/models/${model}:generateContent`, {
      method: "POST", headers: H, signal: AbortSignal.timeout(30000),
      body: JSON.stringify({ contents: [{ parts: [{ text: "ตอบคำเดียว: ok" }] }] }),
    });
    const j = await res.json();
    if (!res.ok) throw new Error(j.error?.message || res.status);
    return `ตอบว่า "${j.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}"`;
  })());
}
