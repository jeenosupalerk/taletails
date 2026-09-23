import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { AuctionShowcase } from "@/components/sections/AuctionShowcase";
import { GradeBadge, MiniFlipCountdown } from "@/components/card/CardBits";
import { SiteFooter } from "@/components/site/SiteFooter";
import { BackButton } from "@/components/site/BackButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { type Auction } from "@/data/auctions";
import { NoLiveAuction } from "@/components/sections/NoLiveAuction";
import { ProductGridCard } from "@/components/sections/FeaturedMarketplace";
import { LogoLoader } from "@/components/ui/logo-loader";
import { useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { useAuth } from "@/lib/auth";
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
          // เดิมมี ItemList ของการ์ดตัวอย่างจาก data/auctions (ไม่ใช่สินค้าจริง) ส่งให้ Google — ตัดออก
          // ถ้าจะทำ ให้ดึงจากประมูลจริงฝั่ง server แทน
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
  const { isAuthenticated } = useAuth();
  const { data: marketCards } = useMarketplaceCards();
  // ข้อมูลจริงเท่านั้น — เดิมถ้าอ่านไม่ได้ (ยังไม่ล็อกอิน/ไม่มีรอบเปิด) จะเอาการ์ดตัวอย่างมาโชว์เป็นประมูลสด
  const allAuctions: AuctionWithOutcome[] = withOutcome(live.data ?? []);
  const hasLive = allAuctions.some((a) => a.outcome.outcome === "live");
  const { id, status } = Route.useSearch();
  // แสดงเฉพาะแท็บที่มีรายการจริง (ไม่มีรอบเปิด = ไม่มีแท็บ "กำลังเปิดประมูล")
  const filters = FILTERS.filter(
    (f) => f.value === "all" || allAuctions.some((a) => a.outcome.outcome === f.value),
  );
  const filter = status && filters.some((f) => f.value === status) ? status : "all";
  const liveAuctions =
    filter === "all" ? allAuctions : allAuctions.filter((a) => a.outcome.outcome === filter);
  const navigate = useNavigate();
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const currentId = id ?? activeId;
  // ห้องประมูลใหญ่ด้านบนมีเฉพาะตอนมีรอบเปิด — ไม่เอารอบที่ปิดแล้วขึ้นมาให้ดูเหมือนยังประมูลอยู่
  const active = hasLive ? (liveAuctions.find((a) => a.id === currentId) ?? liveAuctions[0]) : undefined;
  const activeIncrement = active && "bidIncrement" in active ? (active as LiveAuction).bidIncrement : 50;

  useEffect(() => {
    if (id && typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  const select = (auction: AuctionWithOutcome) => {
    // ไม่มีห้องประมูลด้านบนให้สลับ → เปิดหน้ารอบนั้นแทน
    if (!hasLive) {
      void navigate({ to: "/card/$id", params: { id: (auction as LiveAuction).cardId } });
      return;
    }
    setActiveId(auction.id);
    void navigate({ to: "/auctions", search: { id: auction.id, status: filter }, replace: true });
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

        {live.isLoading ? (
          <div className="flex h-72 items-center justify-center text-muted-foreground">
            <LogoLoader size={64} />
          </div>
        ) : hasLive ? (
          active && (
            <AuctionShowcase
              key={active.id}
              auction={active}
              auctionId={active.id}
              bidIncrement={activeIncrement}
              outcome={active.outcome}
            />
          )
        ) : (
          <NoLiveAuction member={isAuthenticated} />
        )}

        {!live.isLoading && allAuctions.length > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <h2 className="font-display text-2xl font-bold">
              {hasLive ? "รายการประมูลอื่นๆ" : "ผลประมูลรอบที่ผ่านมา"}
            </h2>
            {hasLive && (
              <p className="mt-1 text-sm text-muted-foreground">
                เลือกรายการเพื่อสลับขึ้นไปยังห้องประมูลด้านบนได้ทันที
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {filters.map((f) => {
                const count =
                  f.value === "all"
                    ? allAuctions.length
                    : allAuctions.filter((a) => a.outcome.outcome === f.value).length;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFilter(f.value)}
                    aria-pressed={filter === f.value}
                    className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors ${
                      filter === f.value
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {f.label} {count}
                  </button>
                );
              })}
            </div>

            <div
              className={
                hasLive
                  ? "no-scrollbar -mx-4 mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth px-4 pt-1 pb-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
                  : "mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
              }
            >
              {liveAuctions.map((auction) => (
                <AuctionTile
                  key={auction.id}
                  auction={auction}
                  selected={auction.id === active?.id}
                  inRow={hasLive}
                  onSelect={() => select(auction)}
                />
              ))}
            </div>
          </section>
        )}

        {/* ไม่มีรอบเปิดและไม่มีผลเก่าให้ดู (เช่น ยังไม่ล็อกอิน) → พาไปดูการ์ดที่ขายอยู่จริงแทนหน้าว่าง */}
        {!live.isLoading && !hasLive && allAuctions.length === 0 && (marketCards?.length ?? 0) > 0 && (
          <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="font-display text-2xl font-bold">การ์ดที่ขายอยู่ในตลาดตอนนี้</h2>
              <Link to="/marketplace" className="text-sm font-semibold text-primary hover:underline">
                ดูทั้งหมด
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {(marketCards ?? [])
                .filter((c) => c.status !== "sold")
                .slice(0, 4)
                .map((item) => (
                  <ProductGridCard key={item.id} product={item} />
                ))}
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function AuctionTile({
  auction,
  selected,
  inRow,
  onSelect,
}: {
  auction: AuctionWithOutcome;
  selected: boolean;
  inRow: boolean;
  onSelect: () => void;
}) {
  const isLive = auction.outcome.outcome === "live";
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={inRow ? selected : undefined}
      className={`group flex flex-col rounded-[18px] bg-card p-2 text-left ring-1 transition-shadow duration-200 hover:shadow-card ${
        inRow ? "w-[62%] shrink-0 snap-start sm:w-[230px]" : "w-full"
      } ${selected ? "ring-2 ring-primary" : "ring-border/70"}`}
    >
      {/* รูป 5:7 เท่าการ์ดจริง + ตัวนับเวลาแผ่นส้ม/ป้ายผลมุมซ้ายบน + ป้ายเกรดมุมขวาล่าง */}
      <div className="relative aspect-[5/7] overflow-hidden rounded-xl bg-tile">
        <SmartImage
          src={auction.imageUrl}
          alt={`${auction.cardName} ${auction.grade}`}
          transformWidth={500}
          className={`object-cover transition-transform duration-500 group-hover:scale-[1.03] ${
            isLive ? "" : auction.outcome.tone === "muted" ? "opacity-60 grayscale-[40%]" : ""
          }`}
        />
        {isLive ? (
          <MiniFlipCountdown endTime={auction.endTime} />
        ) : (
          <span
            className={`absolute top-2 left-2 inline-flex max-w-[80%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold shadow-[0_6px_18px_-8px_rgba(0,0,0,0.6)] ${AUCTION_OUTCOME_TONE_CLASS[auction.outcome.tone]}`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${AUCTION_OUTCOME_DOT_CLASS[auction.outcome.tone]}`} />
            <span className="truncate">{auction.outcome.label}</span>
          </span>
        )}
        <GradeBadge grade={auction.grade} company={auction.gradingCompany} condition={auction.conditionNote} />
      </div>

      <div className="flex flex-col px-1.5 pt-2.5 pb-1">
        <p className="truncate text-xs text-muted-foreground">
          {auction.setName !== "-" ? auction.setName : "\u00a0"}
        </p>
        <h3 className="mt-0.5 truncate text-[15px] font-semibold group-hover:text-primary">{auction.cardName}</h3>
        <p className="mt-1.5 text-[11px] text-muted-foreground">{isLive ? "ราคาปัจจุบัน" : "ราคาปิด"}</p>
        <p className="truncate font-display text-lg leading-tight font-bold">{thb.format(auction.currentBid)}</p>
        <p className="mt-0.5 flex h-4 items-center truncate text-[11px] text-muted-foreground">
          {auction.bidCount > 0 ? `${auction.bidCount} บิด` : "ยังไม่มีผู้เสนอราคา"}
          {isLive &&
            "bidIncrement" in auction &&
            ` · ขั้นต่ำถัดไป ${thb.format(
              auction.bidCount === 0 ? auction.currentBid : auction.currentBid + (auction as LiveAuction).bidIncrement,
            )}`}
          {!isLive &&
            ` · ปิด ${new Date(auction.endTime).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}`}
        </p>
      </div>
    </button>
  );
}
