import { createFileRoute } from "@tanstack/react-router";

import { FeaturedMarketplace } from "@/components/sections/FeaturedMarketplace";
import { PageShell } from "@/components/site/PageShell";
import { getFeaturedProducts } from "@/data/products";

const SITE_URL = "https://taletails-test.lovable.app";
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
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: getFeaturedProducts().map((product, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: product.cardName,
                image: `${SITE_URL}${product.imageUrl}`,
                description: `${product.setName} — สภาพ ${product.conditionTag}`,
                sku: product.cardIdCode,
                offers: {
                  "@type": "Offer",
                  price: product.price,
                  priceCurrency: "THB",
                  availability: "https://schema.org/InStock",
                  url: `${SITE_URL}/marketplace`,
                  seller: { "@type": "Organization", name: product.storeName },
                },
              },
            })),
          },
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
      <FeaturedMarketplace showHeading={false} />
    </PageShell>
  );
}
