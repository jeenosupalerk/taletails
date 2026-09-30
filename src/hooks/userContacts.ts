import { supabase } from "@/integrations/supabase/client";

export interface UserContact {
  email: string;
  phone: string | null;
}

/**
 * อีเมล/เบอร์โทรเป็นข้อมูลส่วนตัว: สมาชิกอื่นห้ามอ่านจากตาราง users ตรง ๆ
 * จึงอ่านผ่านฟังก์ชันในฐานข้อมูลที่เช็กสิทธิ์ให้ (ดู patches/2026-09-30_users_pii_*)
 * พลาดแล้วไม่ทำให้หน้าพัง: คืนค่าว่าง ผู้ใช้ยังเข้าใช้งานได้ตามปกติ
 */

/** ข้อมูลติดต่อของผู้ใช้ที่ล็อกอินอยู่ (ของตัวเองเท่านั้น) */
export async function fetchMyContact(): Promise<Partial<UserContact>> {
  const { data, error } = await supabase.rpc("my_contact");
  if (error) return {};
  const row = data?.[0];
  return { email: row?.email ?? "", phone: row?.phone ?? null };
}

/** ข้อมูลติดต่อของสมาชิก สำหรับหลังบ้านเท่านั้น (ไม่ส่ง ids = ทั้งหมด) */
export async function fetchAdminContacts(ids?: string[]): Promise<Map<string, UserContact>> {
  const map = new Map<string, UserContact>();
  const { data, error } = await supabase.rpc("admin_user_contacts", ids ? { p_ids: ids } : {});
  if (error) return map;
  for (const r of data ?? []) map.set(r.id, { email: r.email ?? "", phone: r.phone ?? null });
  return map;
}
