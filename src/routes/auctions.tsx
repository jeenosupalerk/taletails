import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Gavel } from "lucide-react";
import { useEffect, useState } from "react";

import { AuctionShowcase } from "@/components/sections/AuctionShowcase";
import { CountdownBadge } from "@/components/site/CountdownBadge";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BackButton } from "@/components/site/BackButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { getLiveAuctions, type Auction } from "@/data/auctions";
import { useLiveAuctions, type LiveAuction } from "@/hooks/useLiveAuctions";
import { thb } from "@/lib/cart";
import {
  AUCTION_OUTCOME_DOT_CLASS,
  AUCTION_OUTCOME_TONE_CLASS,
  getAuctionOutcome,
  type AuctionOutcomeInfo,
} from "@/lib/auction-status";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ประมูลสด — Taletails";
const description =
  "ประมูลการ์ดสะสมที่ผ่านการตรวจสอบและเก็บในห้องนิรภัย พร้อมนับถอยหลังแบบเรียลไทม์ทุกคืน";

export const Route = createFileRoute("/auctions")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { id?: string | undefined; status?: string | undefined } => ({
    id: typeof search['id'] === "string" ? (search['id'] as string) : undefined,
    status: typeof search['status'] === "string" ? (search['status'] as string) : undefined,
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

type AuctionWithOutcome = Auction & { outcome: AuctionOutcomeInfo };

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "live", label: "กำลังเปิดประมูล" },
  { value: "waiting_payment", label: "รอผู้ชนะชำระเงิน" },
  { value: "failed", label: "ไม่เป็นผล / รอเปิดใหม่" },
  { value: "completed", label: "เสร็จสมบูรณ์" },
];

function withOutcome(list: Auction[]): AuctionWithOutcome[] {
  return list.map((a) =>
    "outcome" in a
      ? (a as AuctionWithOutcome)
      : {
          ...a,
          outcome: getAuctionOutcome(
            a.status === "ended" ? "ended" : "active",
            "available",
            a.endTime,
          ),
        },
  );
}

function AuctionsPage() {
  const live = useLiveAuctions();
  // ใช้ข้อมูลจริงจาก Supabase เมื่ออ่านได้ (ต้องเข้าสู่ระบบ) ไม่งั้นแสดงตัวอย่าง
  const allAuctions: AuctionWithOutcome[] = withOutcome(
    live.data?.length ? live.data : getLiveAuctions(),
  );
  const isRealData = Boolean(live.data?.length);
  const { id, status } = Route.useSearch();
  const filter = status && FILTERS.some((f) => f.value === status) ? status : "all";
  const liveAuctions =
    filter === "all" ? allAuctions : allAuctions.filter((a) => a.outcome.outcome === filter);
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
    void navigate({ to: "/auctions", search: { id: nextId, status: filter }, replace: true });
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const setFilter = (next: string) => {
    setActiveId(undefined);
    void navigate({ to: "/auctions", search: { status: next }, replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <h1 className="sr-only">ประมูลสด Taletails</h1>
        <div className="mx-auto max-w-7xl px-4 pt-5 sm:px-6 lg:px-8">
          <BackButton />
        </div>
        {active && (
          <AuctionShowcase
            key={active.id}
            auction={active}
            auctionId={activeAuctionId}
            bidIncrement={activeIncrement}
            outcome={active.outcome}
          />
        )}

        <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-bold">รายการประมูลอื่นๆ</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            เลือกรายการเพื่อสลับขึ้นไปยังห้องประมูลด้านบนได้ทันที
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors ${
                  filter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {liveAuctions.length === 0 && (
            <p className="mt-6 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
              ยังไม่มีรายการในสถานะนี้
            </p>
          )}

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
                <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-transparent p-3">
                  <SmartImage
                    src={auction.imageUrl}
                    alt={`${auction.cardName} — ${auction.grade}`}
                    transformWidth={600}
                    wrapperClassName="p-1"
                    className="object-contain drop-shadow-xl rounded-lg transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  <span
                    className={`absolute top-3 left-3 inline-flex max-w-[70%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)] ${AUCTION_OUTCOME_TONE_CLASS[auction.outcome.tone]}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${AUCTION_OUTCOME_DOT_CLASS[auction.outcome.tone]}`}
                    />
                    <span className="truncate">{auction.outcome.label}</span>
                  </span>
                  <span className="absolute top-3 right-3 rounded-full border border-accent/40 bg-background/85 px-2.5 py-1 font-display text-[11px] font-bold text-accent">
                    {auction.grade}
                  </span>
                  <div className="absolute right-3 bottom-3 left-3">
                    {auction.outcome.outcome === "live" ? (
                      <CountdownBadge endTime={auction.endTime} className="w-full justify-center" />
                    ) : (
                      <span className="block w-full truncate rounded-full border border-border bg-background/85 px-3 py-1.5 text-center text-[11px] font-semibold text-muted-foreground">
                        ปิดประมูลแล้ว
                      </span>
                    )}
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
                      variant={auction.outcome.outcome === "live" ? "default" : "outline"}
                      className={`min-h-10 shrink-0 rounded-xl px-4 font-semibold transition-opacity ${
                        auction.outcome.outcome === "live"
                          ? "bg-gradient-ember text-primary-foreground shadow-glow hover:opacity-90"
                          : ""
                      }`}
                    >
                      <span>
                        <Gavel className="h-4 w-4" />
                        {auction.outcome.outcome === "live" ? "เสนอราคา" : "ดูรายละเอียด"}
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
