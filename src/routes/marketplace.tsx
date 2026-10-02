import { createFileRoute } from "@tanstack/react-router";

import { FeaturedMarketplace } from "@/components/sections/FeaturedMarketplace";
import { PageShell } from "@/components/site/PageShell";

const SITE_URL = "https://www.taletails-trade.com";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ตลาดซื้อขาย — Taletails";
const description =
  "เลือกซื้อการ์ดใบเดี่ยวจากร้านที่ได้รับการยืนยัน ทุกใบมีรหัสการ์ดที่ตรวจสอบย้อนหลังได้";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/marketplace` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/marketplace` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
              {
                "@type": "ListItem",
                position: 2,
                name: "ตลาดซื้อขาย",
                item: `${SITE_URL}/marketplace`,
              },
            ],
          },
          // รายการสินค้า/บทความใน SEO เคยใช้ข้อมูลตัวอย่าง (ของปลอม) → เอาออก เหลือแค่ breadcrumb
        ]),
      },
    ],
  }),
  component: MarketplacePage,
});

function MarketplacePage() {
  return (
    <PageShell
      eyebrow="รายการแนะนำ"
      title="ตลาดซื้อขาย"
      description="ซื้อได้ทันทีจากร้านค้าที่ยืนยันตัวตนแล้ว ทุกใบมีรหัสการ์ดที่ตรวจสอบย้อนหลังได้"
    >
      <FeaturedMarketplace showHeading={false} showFilter />
    </PageShell>
  );
}
