import { createFileRoute } from "@tanstack/react-router";

import { ArticlesSection } from "@/components/sections/ArticlesSection";
import { FeaturedMarketplace } from "@/components/sections/FeaturedMarketplace";
import { HeroCarousel } from "@/components/sections/HeroCarousel";
import { LiveAuctionSlider } from "@/components/sections/LiveAuctionSlider";
import { TrustStrip } from "@/components/sections/TrustStrip";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { useAuth } from "@/lib/auth";

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ประมูลการ์ดสดทุกคืน + ตลาดการ์ดยืนยันแล้ว | Taletails";
const description =
  "ประมูลการ์ดเกรดพรีเมียมแบบสดทุกคืน ซื้อการ์ดใบเดี่ยวจากร้านที่ยืนยันตัวตน และเก็บทุกใบไว้ในห้องนิรภัยกับ Taletails";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Taletails",
          url: `${SITE_URL}/`,
          inLanguage: "th-TH",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <h1 className="sr-only">
          Taletails — ประมูลการ์ดสะสมสดและตลาดซื้อขายการ์ดที่ยืนยันแล้ว
        </h1>
        <HeroCarousel />
        <LiveAuctionSlider />
        <TrustStrip />
        <FeaturedMarketplace />
        <ArticlesSection />
      </main>
      <SiteFooter />
    </div>
  );
}
