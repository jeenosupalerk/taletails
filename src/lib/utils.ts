import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** id สุ่มสำหรับ key/ชื่อไฟล์ — crypto.randomUUID ใช้ไม่ได้บน http:// และ Safari เก่า */
export const uid = () =>
  crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
