import { useNotificationRealtime } from "@/hooks/useNotifications";

/** ติดตั้งตัวฟังแจ้งเตือนสด "ที่เดียว" ทั้งเว็บ — ห้ามเรียก useNotificationRealtime ที่อื่นซ้ำ */
export function NotificationListener() {
  useNotificationRealtime();
  return null;
}
