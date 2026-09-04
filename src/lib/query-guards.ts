/** สิทธิ์อ่านถูกปิดสำหรับผู้เยี่ยมชม (ยังไม่เข้าสู่ระบบ) — ไม่ถือเป็นข้อผิดพลาดของหน้าเว็บ */
export function isPermissionError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  return (
    e.code === "42501" ||
    e.code === "PGRST301" ||
    Boolean(e.message && /permission denied|JWT|not authorized/i.test(e.message))
  );
}
