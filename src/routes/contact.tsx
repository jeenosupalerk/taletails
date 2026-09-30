import { createFileRoute } from "@tanstack/react-router";

import { EmailLink, LegalPage, type LegalSection } from "@/components/site/LegalPage";
import { legalHead } from "@/lib/legal-head";
import { SITE_URL } from "@/lib/seo";
import { REPORT_WINDOW_DAYS } from "@/lib/site-info";

const title = "ติดต่อเรา | Taletails";
const description =
  "ติดต่อ Taletails ทางอีเมลเพื่อขอรูปสินค้าเพิ่มเติมก่อนจัดส่ง แจ้งปัญหาสินค้า หรือขอแก้ไข/ลบข้อมูลส่วนตัว";

export const Route = createFileRoute("/contact")({
  head: () => legalHead("/contact", title, description, SITE_URL),
  component: ContactPage,
});

const sections: LegalSection[] = [
  {
    heading: "ช่องทางติดต่อ",
    paragraphs: [
      <>
        Taletails รับเรื่องทางอีเมลเท่านั้น: <EmailLink />
      </>,
    ],
  },
  {
    heading: "เรื่องที่ติดต่อได้",
    items: [
      "ขอรูปถ่ายสินค้าเพิ่มเติม ก่อนที่ร้านจะจัดส่ง",
      `แจ้งปัญหากับสินค้าที่ได้รับ ภายใน ${REPORT_WINDOW_DAYS} วันนับจากวันที่ได้รับสินค้า`,
      "ขอเข้าถึง แก้ไข หรือลบข้อมูลส่วนตัว",
    ],
  },
  {
    heading: "ควรแจ้งอะไรในอีเมล",
    items: [
      'เลขคำสั่งซื้อ (ดูได้ในหน้า "การซื้อของฉัน") หรือชื่อสินค้า',
      "อีเมลหรือชื่อผู้ใช้ที่ใช้สมัครกับ Taletails",
      "รายละเอียดสิ่งที่ต้องการ และรูปถ่ายประกอบถ้ามี",
    ],
  },
];

function ContactPage() {
  return (
    <LegalPage
      title="ติดต่อเรา"
      summary="ติดต่อร้านทางอีเมล ระบุเลขคำสั่งซื้อและรายละเอียดเพื่อให้ตรวจสอบได้เร็วขึ้น"
      sections={sections}
      current="/contact"
    />
  );
}
