import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowDownWideNarrow, ChevronDown, Gavel, History } from "lucide-react";
import { useEffect, useState } from "react";

import { AuctionCard, auctionKind } from "@/components/card/AuctionCard";
import { NoLiveAuction } from "@/components/sections/NoLiveAuction";
import { BackButton } from "@/components/site/BackButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { useLiveAuctions, type LiveAuction } from "@/hooks/useLiveAuctions";
import { useAuth } from "@/lib/auth";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

const title = "ประมูลสด — Taletails";
const description =
  "ประมูลการ์ดสะสมที่ผ่านการตรวจสอบ ดูรอบที่กำลังเปิด รอบที่จะเปิดเร็ว ๆ นี้ และราคาปิดของรอบที่ผ่านมา";

type Tab = "live" | "upcoming" | "past";

/** ลิงก์เก่า (?status=completed / waiting_payment / failed) → แท็บผลที่ผ่านมา */
function toTab(status: string | undefined): Tab | undefined {
  if (status === "live" || status === "upcoming" || status === "past") return status;
  if (status === "completed" || status === "waiting_payment" || status === "failed") return "past";
  return undefined;
}

export const Route = createFileRoute("/auctions")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { id?: string | undefined; status?: string | undefined } => ({
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
    status: typeof search["status"] === "string" ? (search["status"] as string) : undefined,
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
        ]),
      },
    ],
  }),
  component: AuctionsPage,
});

const SORTS: { value: string; label: string }[] = [
  { value: "ending", label: "ใกล้ปิดก่อน" },
  { value: "bids", label: "บิดมากสุด" },
  { value: "price-desc", label: "ราคา: สูง → ต่ำ" },
  { value: "price-asc", label: "ราคา: ต่ำ → สูง" },
];

/**
 * หน้ารวมประมูล — แท็บ กำลังประมูล / เร็ว ๆ นี้ / ผลที่ผ่านมา + ตารางการ์ด
 * เดิมมีห้องประมูลเต็มรูปแบบซ้อนอยู่บนสุด (ซ้ำกับหน้า /card) → ย้ายไปเสนอราคาที่ /card/$id ที่เดียว
 */
function AuctionsPage() {
  const live = useLiveAuctions();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { id, status } = Route.useSearch();
  const [sort, setSort] = useState("ending");

  const now = Date.now();
  const all = live.data ?? [];
  const running = all.filter((a) => auctionKind(a, now) === "live");
  const upcoming = all
    .filter((a) => auctionKind(a, now) === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const past = all
    .filter((a) => auctionKind(a, now) === "past")
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  // ลิงก์เก่าแบบ /auctions?id=<รอบ> (เคยเปิดห้องประมูลในหน้านี้) → ส่งไปหน้าการ์ดของรอบนั้น
  useEffect(() => {
    if (!id || !live.data) return;
    const hit = live.data.find((a) => a.id === id);
    if (hit) void navigate({ to: "/card/$id", params: { id: hit.cardId }, replace: true });
  }, [id, live.data, navigate]);

  // แท็บเริ่มต้น: มีรอบเปิด → กำลังประมูล, ไม่มีแต่มีตั้งเวลาไว้ → เร็ว ๆ นี้, นอกนั้น → ผลที่ผ่านมา
  const fallbackTab: Tab = running.length
    ? "live"
    : upcoming.length
      ? "upcoming"
      : past.length
        ? "past"
        : "live";
  const tab = toTab(status) ?? fallbackTab;
  const setTab = (next: Tab) =>
    void navigate({ to: "/auctions", search: { status: next }, replace: true });

  const sortedRunning = [...running].sort((a, b) => {
    if (sort === "bids") return b.bidCount - a.bidCount;
    if (sort === "price-desc") return b.currentBid - a.currentBid;
    if (sort === "price-asc") return a.currentBid - b.currentBid;
    return new Date(a.endTime).getTime() - new Date(b.endTime).getTime();
  });
  // ใบที่ใกล้ปิดที่สุดขึ้นเป็นแถบเด่นด้านบน (เฉพาะตอนเรียงใกล้ปิดก่อน) ที่เหลือลงตาราง
  const featured = sort === "ending" ? sortedRunning[0] : undefined;
  const gridRunning = featured ? sortedRunning.slice(1) : sortedRunning;

  const TABS: { key: Tab; label: string; count: number }[] = [
    { key: "live", label: "กำลังประมูล", count: running.length },
    { key: "upcoming", label: "เร็ว ๆ นี้", count: upcoming.length },
    { key: "past", label: "ผลที่ผ่านมา", count: past.length },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 pt-5 pb-16 sm:px-6 lg:px-8">
        <BackButton />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <h1 className="font-display text-3xl font-bold">ประมูล</h1>
          {tab === "live" && running.length > 1 && (
            <div className="relative">
              <ArrowDownWideNarrow className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="เรียงลำดับ"
                className="h-11 cursor-pointer appearance-none rounded-full border border-border bg-card pr-9 pl-9 text-xs font-semibold"
              >
                {SORTS.map((o) => (
                  <option key={o.value} value={o.value}>
                    เรียง: {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          )}
        </div>

        <div
          role="tablist"
          aria-label="สถานะการประมูล"
          className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        >
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border px-4 text-sm font-semibold transition-colors",
                tab === t.key
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {!live.isLoading && t.count > 0 && (
                <span className="tabular-nums opacity-70">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {live.isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[5/7] rounded-[18px]" />
            ))}
          </div>
        ) : tab === "live" ? (
          running.length === 0 ? (
            <div className="mt-6">
              <NoLiveAuction member={isAuthenticated} />
              {upcoming.length > 0 && (
                <p className="mt-4 text-center text-sm">
                  มี {upcoming.length} รอบที่ตั้งเวลาเปิดไว้แล้ว{" "}
                  <button
                    type="button"
                    onClick={() => setTab("upcoming")}
                    className="min-h-11 font-semibold text-primary"
                  >
                    ดูเร็ว ๆ นี้
                  </button>
                </p>
              )}
            </div>
          ) : (
            <>
              {featured && <EndingSoonStrip auction={featured} />}
              {gridRunning.length > 0 && <Grid items={gridRunning} />}
            </>
          )
        ) : tab === "upcoming" ? (
          upcoming.length === 0 ? (
            <Empty
              title="ยังไม่มีรอบที่ตั้งเวลาไว้"
              body="เมื่อร้านตั้งเวลาเปิดรอบใหม่ จะขึ้นที่นี่พร้อมนับถอยหลัง"
            />
          ) : (
            <Grid items={upcoming} />
          )
        ) : past.length === 0 ? (
          isAuthenticated ? (
            <Empty title="ยังไม่มีผลประมูล" body="รอบที่ปิดแล้วจะแสดงราคาปิดจริงที่นี่" />
          ) : (
            <Empty
              title="เข้าสู่ระบบเพื่อดูผลประมูลที่ผ่านมา"
              body="หรือดูราคาขายจริงล่าสุดของแต่ละการ์ดได้ที่หน้าสถิติราคา"
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild className="min-h-11 rounded-xl">
                    <Link to="/auth">เข้าสู่ระบบ</Link>
                  </Button>
                  <Button asChild variant="secondary" className="min-h-11 rounded-xl">
                    <Link to="/market">ดูสถิติราคา</Link>
                  </Button>
                </div>
              }
            />
          )
        ) : (
          <Grid items={past} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Grid({ items }: { items: LiveAuction[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {items.map((a) => (
        <AuctionCard key={a.id} auction={a} />
      ))}
    </div>
  );
}

function Empty({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="mt-6 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
      <History className="h-7 w-7 text-muted-foreground" />
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** แถบ "ใกล้ปิดที่สุด" 1 แถว แทนห้องประมูลเต็มจอเดิม — ปุ่มเสนอราคาพาไปหน้าการ์ด */
function EndingSoonStrip({ auction: a }: { auction: LiveAuction }) {
  const c = useCountdown(a.endTime);
  const urgent = !!c && !c.isFinished && c.totalMs < 60 * 60 * 1000;
  const left = c
    ? c.days > 0
      ? `${c.days} วัน ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`
      : `${c.hours > 0 ? `${pad(c.hours)}:` : ""}${pad(c.minutes)}:${pad(c.seconds)}`
    : "";
  return (
    <Link
      to="/card/$id"
      params={{ id: a.cardId }}
      data-urgent={urgent}
      className="live-frame group mt-5 flex items-center gap-3 rounded-[18px] bg-card p-3 sm:gap-5 sm:p-4"
    >
      <div className="relative aspect-[5/7] w-[74px] shrink-0 overflow-hidden rounded-xl bg-tile sm:w-[96px]">
        <SmartImage
          src={a.imageUrl}
          alt={a.cardName}
          transformWidth={240}
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cd-fg)] sm:text-sm">
          <span className="live-dot text-[oklch(0.62_0.22_30)]" aria-hidden />
          ใกล้ปิดที่สุด <span className="font-display tabular-nums">{left}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 font-semibold break-words group-hover:text-primary sm:text-lg">
          {a.cardName}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
          <span>ราคาปัจจุบัน</span>
          <span className="font-display text-lg font-bold text-foreground sm:text-xl">
            {thb.format(a.currentBid)}
          </span>
          <span>{a.bidCount > 0 ? `${a.bidCount} บิด` : "ยังไม่มีบิด"}</span>
        </p>
      </div>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-ember text-primary-foreground sm:hidden"
        aria-hidden
      >
        <Gavel className="h-4 w-4" />
      </span>
      <span className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-ember px-5 text-sm font-semibold text-primary-foreground sm:inline-flex">
        <Gavel className="h-4 w-4" /> เสนอราคา
      </span>
    </Link>
  );
}
