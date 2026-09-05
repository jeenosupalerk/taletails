/** ข้อมูลบัญชีรับโอนที่แสดงในหน้าชำระเงิน (ตั้งค่าได้ผ่าน env) */
const env = import.meta.env as Record<string, string | undefined>;

export const bankAccount = {
  bank: env['VITE_BANK_NAME']?.trim() || "ธนาคารกสิกรไทย (KBank)",
  name: env['VITE_BANK_ACCOUNT_NAME']?.trim() || "บจก. เทลเทลส์ (TaleTails)",
  number: env['VITE_BANK_ACCOUNT_NUMBER']?.trim() || "123-4-56789-0",
};
