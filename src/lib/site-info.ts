import { HAS_PROMPTPAY_ID } from "@/lib/promptpay";

/**
 * ข้อมูลร้านที่ใช้ในหน้านโยบาย/ติดต่อ — แก้ที่นี่ที่เดียว
 * (repo เป็น public: ใส่เฉพาะช่องทางที่ตั้งใจให้ลูกค้าเห็น)
 */
export const SITE_NAME = "Taletails";

/** อีเมลรับเรื่องจากลูกค้า (ขอรูปเพิ่มเติม, แจ้งปัญหาสินค้า, ขอแก้ไข/ลบข้อมูล) */
export const CONTACT_EMAIL = "shizu.taletails@gmail.com";

/** วันที่ปรับปรุงเงื่อนไข/นโยบายล่าสุด (แก้เมื่อเนื้อหาเปลี่ยน) */
export const POLICY_UPDATED = "1 ตุลาคม 2569";

/**
 * เปิดช่อง "โอนเอง + แนบสลิป" ตอนชำระเงินหรือไม่ — ปิดไว้ตอนเปิดร้าน (2 ต.ค. 2569) ใช้แค่ Stripe
 * จะเปิดต้องตั้ง VITE_PROMPTPAY_ID เป็นเลขจริงของร้านก่อน build (ถ้าไม่มีเลข ช่องนี้ซ่อนเองอยู่ดี)
 */
export const MANUAL_TRANSFER_ENABLED = false;

/** ช่องโอนเองใช้ได้จริง = เปิดไว้ และมีเลข PromptPay ของร้าน */
export const MANUAL_ALLOWED = MANUAL_TRANSFER_ENABLED && HAS_PROMPTPAY_ID;

/**
 * ปุ่ม "ดำเนินการต่อด้วย Facebook" — ปิดไว้ก่อน (2 ต.ค. 2569) ยังไม่ได้เปิด provider Facebook ใน Supabase
 * เปิดเมื่อตั้งค่า Facebook app + provider ใน Supabase เรียบร้อยแล้ว (หน้านโยบายจะแสดงคำว่า Facebook ตามสวิตช์นี้)
 */
export const FACEBOOK_LOGIN_ENABLED = false;

/** ผู้ซื้อต้องแจ้งปัญหาสินค้าภายในกี่วันหลังได้รับของ */
export const REPORT_WINDOW_DAYS = 1;
