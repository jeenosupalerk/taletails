import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { useEffect, useState } from "react";

import { AuctionShowcase } from "@/components/sections/AuctionShowcase";
import { CountdownBadge } from "@/components/site/CountdownBadge";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BackButton } from "@/components/site/BackButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { getLiveAuctions } from "@/data/auctions";
import { thb } from "@/lib/cart";

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ประมูลสด — Taletails";
const description =
  "ประมูลการ์ดสะสมที่ผ่านการตรวจสอบและเก็บในห้องนิรภัย พร้อมนับถอยหลังแบบเรียลไทม์ทุกคืน";

export const Route = createFileRoute("/auctions")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search['id'] === "string" ? (search['id'] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/auctions` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/auctions` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify([
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
              { "@type": "ListItem", position: 2, name: "ประมูล", item: `${SITE_URL}/auctions` },
            ],
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            itemListElement: getLiveAuctions().map((auction, i) => ({
              "@type": "ListItem",
              position: i + 1,
              item: {
                "@type": "Product",
                name: `${auction.cardName} (${auction.grade})`,
                image: `${SITE_URL}${auction.imageUrl}`,
                description: `${auction.setName} — เกรด ${auction.grade}`,
                offers: {
                  "@type": "Offer",
                  price: auction.currentBid,
                  priceCurrency: "THB",
                  availability: "https://schema.org/InStock",
                  url: `${SITE_URL}/auctions`,
                },
              },
            })),
          },
        ]),
      },
    ],
  }),
  component: AuctionsPage,
});

function AuctionsPage() {
  const live = useLiveAuctions();
  // ใช้ข้อมูลจริงจาก Supabase เมื่ออ่านได้ (ต้องเข้าสู่ระบบ) ไม่งั้นแสดงตัวอย่าง
  const liveAuctions = live.data?.length ? live.data : getLiveAuctions();
  const isRealData = Boolean(live.data?.length);
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const currentId = id ?? activeId;
  const active = liveAuctions.find((a) => a.id === currentId) ?? liveAuctions[0];
  const activeAuctionId = isRealData ? active?.id : undefined;
  const activeIncrement =
    isRealData && active && "bidIncrement" in active ? (active as LiveAuction).bidIncrement : 50;

  useEffect(() => {
    if (id && typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  const select = (nextId: string) => {
    setActiveId(nextId);
    void navigate({ to: "/auctions", search: { id: nextId }, replace: true });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <h1 className="sr-only">ประมูลสด Taletails</h1>
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <BackButton />
        </div>
        {active && <AuctionShowcase key={active.id} auction={active} />}

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold">รายการประมูลอื่นๆ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เลือกรายการเพื่อสลับขึ้นไปยังห้องประมูลด้านบนได้ทันที
          </p>

          <div className="no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
            {liveAuctions.map((auction) => (
              <button
                key={auction.id}
                type="button"
                onClick={() => select(auction.id)}
                aria-pressed={auction.id === active?.id}
                className={`group w-[78%] shrink-0 snap-start overflow-hidden rounded-3xl border bg-card text-left shadow-[0_16px_40px_-24px_hsl(var(--foreground)/0.35)] transition-all duration-300 hover:-translate-y-1 hover:shadow-glow sm:w-[300px] ${
                  auction.id === active?.id ? "border-primary shadow-glow" : "border-border"
                }`}
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-gradient-vault">
                  <img
                    src={auction.imageUrl}
                    alt={`${auction.cardName} — ${auction.grade}`}
                    width={768}
                    height={1024}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute top-3 right-3 rounded-full border border-accent/40 bg-background/85 px-2.5 py-1 font-display text-[11px] font-bold text-accent">
                    {auction.grade}
                  </span>
                  <div className="absolute right-3 bottom-3 left-3">
                    <CountdownBadge endTime={auction.endTime} className="w-full justify-center" />
                  </div>
                </div>

                <div className="p-3.5">
                  <h3 className="truncate font-display text-sm font-semibold group-hover:text-primary">
                    {auction.cardName}
                  </h3>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {auction.setName}
                  </p>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] tracking-wide text-muted-foreground">
                        ราคาปัจจุบัน
                      </p>
                      <p className="truncate font-display text-lg leading-tight font-bold text-primary">
                        {thb.format(auction.currentBid)}
                      </p>
                    </div>
                    <Button
                      asChild
                      className="h-10 shrink-0 rounded-xl bg-gradient-ember px-4 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90"
                    >
                      <span>
                        <Gavel className="h-4 w-4" />
                        เสนอราคา
                      </span>
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
