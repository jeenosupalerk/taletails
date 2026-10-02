import { createFileRoute } from "@tanstack/react-router";

import { ArticlesSection } from "@/components/sections/ArticlesSection";
import { PageShell } from "@/components/site/PageShell";

const SITE_URL = "https://www.taletails-trade.com";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ข่าวสารและคู่มือ — Taletails";
const description =
  "อัปเดตตลาดการ์ดสะสม เคล็ดลับการเกรด และเบื้องหลังการตรวจสอบความแท้จาก Taletails";

export const Route = createFileRoute("/news")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/news` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/news` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "ข่าวสาร", item: `${SITE_URL}/news` },
            ],
          },
          // รายการสินค้า/บทความใน SEO เคยใช้ข้อมูลตัวอย่าง (ของปลอม) → เอาออก เหลือแค่ breadcrumb
        ]),
      },
    ],
  }),
  component: NewsPage,
});

function NewsPage() {
  return (
    <PageShell
      eyebrow="จากถ้ำจิ้งจอก"
      title="ข่าวสารและคู่มือ"
      description="เคล็ดลับการเกรด บทวิเคราะห์ตลาด และเบื้องหลังการตรวจสอบความแท้"
    >
      <ArticlesSection showHeading={false} />
    </PageShell>
  );
}
