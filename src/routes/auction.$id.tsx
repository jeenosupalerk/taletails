import { createFileRoute, redirect } from "@tanstack/react-router";

/**
 * หน้าประมูลรุ่นแรก (เดโม) — เคยแสดงเฉพาะการ์ดตัวอย่างจาก data/auctions เปิดรายการประมูลจริงไม่ได้
 * และไม่มีลิงก์ไหนในเว็บพามาแล้ว ประมูลจริงใช้หน้า /card/$id
 * เก็บ route ไว้เพื่อส่งลิงก์เก่าที่อาจถูกแชร์/ถูก Google เก็บไว้ ไปหน้ารวมประมูลแทนการขึ้นหน้าเดโม
 */
export const Route = createFileRoute("/auction/$id")({
  beforeLoad: () => {
    throw redirect({ to: "/auctions", search: { id: undefined, status: undefined }, statusCode: 301 });
  },
});
