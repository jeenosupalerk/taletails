import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Gavel, Layers, LineChart, Radio, TrendingUp } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import { PageShell } from "@/components/site/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatThb } from "@/data/market";
import { useMarketStats, type MarketSale } from "@/hooks/useMarketStats";
import { useActiveListings, type ActiveListing } from "@/hooks/useMarketListings";
import type { MarketCard } from "@/data/market";
import {
  changeInWindow,
  rangeDaysOf,
  splitGrade,
  STAT_RANGES,
  timeAgo,
  type StatRange,
} from "@/lib/market-price";
import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "สถิติตลาด — Taletails";
const description =
  "ติดตามราคาและเทรนด์การ์ดสะสมแบบเรียลไทม์ มูลค่าซื้อขายรวม การ์ดมาแรง และสถิติตลาดกลางของ Taletails";

type GradeTab = "all" | "sqc" | "intl" | "raw";
const GRADE_TABS: { key: GradeTab; label: string; hint: string }[] = [
  { key: "all", label: "ทั้งหมด", hint: "ทุกเกรด" },
  { key: "sqc", label: "เกรดไทย (SQC)", hint: "ราคากลางของการ์ดเกรด SQC บริษัทเกรดของไทย" },
  { key: "intl", label: "เกรดต่างประเทศ", hint: "PSA, BGS, CGC, SGC และอื่นๆ" },
  { key: "raw", label: "ไม่เกรด", hint: "การ์ด Raw / ระบุสภาพ" },
];

/** จัดกลุ่มเกรดจากข้อความเกรด เช่น "SQC 10" → sqc, "PSA 9" → intl, "Raw"/"Near Mint" → raw */
function gradeGroup(gradeText: string): Exclude<GradeTab, "all"> {
  const { company } = splitGrade(gradeText);
  if (company === "SQC") return "sqc";
  return company ? "intl" : "raw";
}

export const Route = createFileRoute("/market/")({
  // ?grade=sqc เปิดแท็บเกรดไทยได้ตรงๆ (แชร์ลิงก์ราคากลางเกรดไทยได้)
  validateSearch: (search: Record<string, unknown>): { grade?: GradeTab | undefined } => ({
    grade: GRADE_TABS.some((t) => t.key === search["grade"]) ? (search["grade"] as GradeTab) : undefined,
  }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/market` }],
  }),
  component: MarketPage,
});

const DAY = 86_400_000;

interface Row {
  card: MarketCard;
  count: number;
  value: number;
  change: number | null;
}

function MarketPage() {
  const { cards: marketCards, sales, isLoading: loading } = useMarketStats();
  const { byKey: listings } = useActiveListings();
  const [range, setRange] = useState<StatRange>("7d");
  const { grade: gradeParam } = Route.useSearch();
  const navigate = Route.useNavigate();
  const gradeTab: GradeTab = gradeParam ?? "all";
  const setGradeTab = (g: GradeTab) =>
    void navigate({ search: { grade: g === "all" ? undefined : g }, replace: true, resetScroll: false });
  const gradeInfo = GRADE_TABS.find((t) => t.key === gradeTab)!;
  const days = rangeDaysOf(range);
  const rangeLabel = STAT_RANGES.find((r) => r.key === range)?.label ?? "";

  // กรองตามแท็บเกรดก่อนคำนวณทุกอย่าง (ตัวเลขสรุป ตาราง และขายล่าสุด)
  const gradeCards = useMemo(
    () => (gradeTab === "all" ? marketCards : marketCards.filter((c) => gradeGroup(c.grade) === gradeTab)),
    [marketCards, gradeTab],
  );
  const gradeSales = useMemo(
    () => (gradeTab === "all" ? sales : sales.filter((s) => gradeGroup(s.grade) === gradeTab)),
    [sales, gradeTab],
  );

  const { rows, kpi } = useMemo(() => {
    const now = Date.now();
    const inRange = (t: number) => days === null || now - t <= days * DAY;
    const inPrev = (t: number) => days !== null && now - t > days * DAY && now - t <= 2 * days * DAY;

    const salesIn = gradeSales.filter((s) => inRange(s.soldAt));
    const value = salesIn.reduce((sum, s) => sum + s.price, 0);
    const prevValue = gradeSales.filter((s) => inPrev(s.soldAt)).reduce((sum, s) => sum + s.price, 0);

    const rows: Row[] = gradeCards
      .map((card) => {
        const pts = (card.sales ?? []).filter((s) => inRange(s.soldAt));
        return {
          card,
          count: pts.length,
          value: pts.reduce((sum, s) => sum + s.price, 0),
          change: changeInWindow(card.sales ?? [], days, now),
        };
      })
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count || b.value - a.value);

    return {
      rows,
      kpi: {
        value,
        valueChange: days !== null && prevValue ? ((value - prevValue) / prevValue) * 100 : null,
        count: salesIn.length,
        auctions: salesIn.filter((s) => s.isAuction).length,
        models: new Set(salesIn.map((s) => s.key)).size,
        allTime: gradeSales.length,
      },
    };
  }, [gradeCards, gradeSales, days]);

  const recent = gradeSales.slice(0, 8);

  return (
    <PageShell
      eyebrow="Market Statistics"
      title="สถิติตลาดการ์ด"
      description="ราคาและเทรนด์การ์ดสะสม คำนวณจากรายการที่ซื้อขายสำเร็จจริง รวมทุกใบของการ์ดรุ่นเดียวกัน (ชื่อ + ชุด + เกรด)"
    >
      <section className="mx-auto max-w-7xl space-y-5 px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {/* แท็บกลุ่มเกรด */}
        <div className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0" role="tablist" aria-label="กลุ่มเกรด">
          {GRADE_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={gradeTab === t.key}
              title={t.hint}
              onClick={() => setGradeTab(t.key)}
              className={cn(
                "-mb-px shrink-0 border-b-2 px-3.5 pt-1 pb-2.5 text-sm font-semibold transition-colors",
                gradeTab === t.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.key === "sqc" && <span className="mr-1" aria-hidden>🇹🇭</span>}
              {t.label}
            </button>
          ))}
        </div>

        {gradeTab === "sqc" && (
          <div className="flex items-start gap-3 rounded-2xl bg-primary/[0.06] p-4 ring-1 ring-primary/20">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[oklch(0.3_0.03_50)] font-display text-[10px] font-extrabold text-white">
              SQC
            </span>
            <div className="text-sm">
              <p className="font-semibold">ราคากลางการ์ดเกรดไทย (SQC)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                คำนวณจากการประมูลและการขายที่ชำระเงินสำเร็จจริงบน Taletails · ราคาตลาด = เฉลี่ย 3 ครั้งล่าสุดภายใน 90 วัน
                ของการ์ดรุ่นเดียวกัน (ชื่อ + ชุด + เกรด)
              </p>
            </div>
          </div>
        )}

        {/* ช่วงเวลา */}
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:justify-end sm:px-0">
          {STAT_RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={cn(
                "min-h-9 shrink-0 rounded-full px-4 text-xs font-semibold transition-colors",
                range === r.key
                  ? "bg-foreground text-background"
                  : "bg-card text-muted-foreground ring-1 ring-border hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* ตัวเลขสรุป */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          <Kpi icon={TrendingUp} label={`มูลค่าซื้อขาย · ${rangeLabel}`} value={formatThb(kpi.value)}>
            {kpi.valueChange !== null && (
              <span className={cn("flex items-center gap-1 font-semibold", kpi.valueChange >= 0 ? "text-success" : "text-destructive")}>
                {kpi.valueChange >= 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {kpi.valueChange >= 0 ? "+" : ""}
                {kpi.valueChange.toFixed(1)}% จากช่วงก่อนหน้า
              </span>
            )}
          </Kpi>
          <Kpi icon={Activity} label={`ขายได้ · ${rangeLabel}`} value={`${kpi.count.toLocaleString("th-TH")} รายการ`}>
            ซื้อทันที {kpi.count - kpi.auctions} · ประมูล {kpi.auctions}
          </Kpi>
          <Kpi
            icon={Layers}
            label="การ์ดที่มีการซื้อขาย"
            value={`${kpi.models.toLocaleString("th-TH")} รุ่น`}
            className="col-span-2 lg:col-span-1"
          >
            รวม {kpi.allTime.toLocaleString("th-TH")} รายการตั้งแต่เปิดตลาด
          </Kpi>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[1fr_340px]">
          {/* การ์ดมาแรง */}
          <div className="surface-panel overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
              <div className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold">
                  {gradeTab === "sqc" ? "ราคากลางเกรดไทย" : "การ์ดมาแรง"} · {rangeLabel}
                </h2>
              </div>
              <span className="hidden text-xs text-muted-foreground sm:inline">ราคาตลาด = เฉลี่ย 3 ครั้งล่าสุด</span>
            </div>

            {loading ? (
              <div className="space-y-1 p-2" aria-busy="true" aria-label="กำลังโหลดข้อมูลตลาด">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                    <Skeleton className="h-14 w-10 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <LineChart className="h-10 w-10 text-muted-foreground/50" />
                <p className="font-semibold">
                  {gradeSales.length
                    ? `ช่วง ${rangeLabel} ยังไม่มีการซื้อขาย`
                    : gradeTab === "sqc"
                      ? "ยังไม่มีการ์ดเกรด SQC ที่ขายหรือประมูลสำเร็จ"
                      : gradeTab === "all"
                        ? "ยังไม่มีรายการซื้อขายสำเร็จบนตลาดกลาง"
                        : `ยังไม่มีการซื้อขายในกลุ่ม${gradeInfo.label}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {gradeSales.length
                    ? "ลองเลือกช่วงเวลาที่ยาวขึ้น"
                    : gradeTab === "sqc"
                      ? "เมื่อการ์ด SQC ประมูลจบและผู้ชนะชำระเงินแล้ว ราคาจะถูกนำมาสร้างราคากลางเกรดไทยที่นี่อัตโนมัติ"
                      : "เมื่อมีการชำระเงินเรียบร้อย ระบบจะสรุปราคาและสถิติให้อัตโนมัติ"}
                </p>
                {gradeSales.length > 0 && range !== "all" && (
                  <button
                    type="button"
                    onClick={() => setRange("all")}
                    className="mt-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold text-primary"
                  >
                    ดูทั้งหมด
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* มือถือ: รายการแบบการ์ด */}
                <ul className="divide-y divide-border md:hidden">
                  {rows.map((r) => (
                    <li key={r.card.id}>
                      <MobileRow row={r} listings={listings.get(r.card.key ?? "") ?? []} />
                    </li>
                  ))}
                </ul>

                {/* เดสก์ท็อป: ตาราง */}
                <div className="hidden md:block">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="px-4 py-3 font-medium sm:px-5">#</th>
                        <th className="px-2 py-3 font-medium">การ์ด</th>
                        <th className="px-2 py-3 text-right font-medium">ราคาตลาด</th>
                        <th className="px-2 py-3 text-right font-medium">{rangeLabel}</th>
                        <th className="px-2 py-3 font-medium">แนวโน้ม</th>
                        <th className="px-2 py-3 text-right font-medium">ขายแล้ว</th>
                        <th className="px-4 py-3 text-right font-medium sm:px-5">ในตลาดตอนนี้</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {rows.map((r, i) => (
                        <tr key={r.card.id} className="group transition-colors hover:bg-secondary/50">
                          <td className="px-4 py-3 font-semibold text-muted-foreground sm:px-5">{i + 1}</td>
                          <td className="px-2 py-3">
                            <Link to="/market/$id" params={{ id: r.card.id }} className="flex items-center gap-3">
                              <Thumb card={r.card} />
                              <span className="min-w-0">
                                <span className="block truncate font-semibold group-hover:text-primary">
                                  {r.card.cardName}
                                </span>
                                <span className="block truncate text-xs text-muted-foreground">
                                  {r.card.setName} · {r.card.grade}
                                </span>
                              </span>
                            </Link>
                          </td>
                          <td className="px-2 py-3 text-right font-bold whitespace-nowrap tabular-nums">
                            {formatThb(r.card.marketPrice ?? r.card.lastPrice)}
                          </td>
                          <td className="px-2 py-3 text-right">
                            <Change value={r.change} />
                          </td>
                          <td className="px-2 py-3">
                            <Sparkline card={r.card} />
                          </td>
                          <td className="px-2 py-3 text-right whitespace-nowrap text-muted-foreground tabular-nums">
                            {r.count} ครั้ง
                          </td>
                          <td className="px-4 py-3 text-right sm:px-5">
                            <ForSale listings={listings.get(r.card.key ?? "") ?? []} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>

          {/* ขายล่าสุด */}
          <aside className="surface-panel overflow-hidden" aria-label="ขายล่าสุด">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h2 className="text-base font-bold">ขายล่าสุด</h2>
              <span className="flex items-center gap-1 text-[11px] font-semibold text-success">
                <Radio className="h-3.5 w-3.5" /> อัปเดตอัตโนมัติ
              </span>
            </div>
            {recent.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                {gradeTab === "all" ? "ยังไม่มีการขาย" : `ยังไม่มีการขายในกลุ่ม${gradeInfo.label}`}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((s, i) => (
                  <li key={`${s.cardId}-${i}`}>
                    <RecentSale sale={s} cards={marketCards} />
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>
      </section>
    </PageShell>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  children,
  className,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("surface-panel flex items-center gap-3 p-4 sm:gap-4 sm:p-5", className)}>
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:flex">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
        <p className="truncate text-xl font-bold tracking-tight sm:text-2xl">{value}</p>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

function Thumb({ card, className }: { card: MarketCard; className?: string }) {
  return (
    <SmartImage
      src={card.imageUrl}
      alt={card.cardName}
      transformWidth={120}
      wrapperClassName={cn("h-14 w-10 shrink-0 overflow-hidden rounded-md bg-tile ring-1 ring-border", className)}
      className="object-cover"
    />
  );
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>;
  const up = value >= 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold tabular-nums",
        up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
      )}
    >
      {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
      {up ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

/** กราฟเส้นเล็กจากราคาขาย 10 ครั้งล่าสุด */
function Sparkline({ card }: { card: MarketCard }) {
  const pts = (card.sales ?? []).slice(-10).map((s) => s.price);
  if (pts.length < 2) return <span className="text-xs text-muted-foreground">—</span>;
  const w = 80;
  const h = 26;
  const max = Math.max(...pts);
  const min = Math.min(...pts);
  const d = pts
    .map((p, i) => {
      const x = (i / (pts.length - 1)) * w;
      const y = h - 3 - ((p - min) / (max - min || 1)) * (h - 6);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = pts[pts.length - 1]! >= pts[0]!;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className={up ? "text-success" : "text-destructive"}>
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** "มีขาย N ใบ · เริ่ม ฿X" — ลิงก์ไปใบที่ถูกที่สุด หรือห้องประมูล */
function ForSale({ listings }: { listings: ActiveListing[] }) {
  if (!listings.length) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-medium whitespace-nowrap text-muted-foreground">
        ยังไม่มีขาย
      </span>
    );
  }
  const fixed = listings.filter((l) => l.kind === "fixed");
  const first = listings[0]!;
  const cls =
    "inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold whitespace-nowrap text-primary transition-colors hover:bg-primary/15";
  const label = fixed.length
    ? `มีขาย ${fixed.length} ใบ · เริ่ม ${formatThb(fixed[0]!.price)}`
    : `ประมูลอยู่ ${listings.length}`;
  return first.kind === "fixed" ? (
    <Link to="/product/$id" params={{ id: first.cardId }} className={cls}>
      {label} <ArrowRight className="h-3 w-3" />
    </Link>
  ) : (
    <Link to="/card/$id" params={{ id: first.cardId }} className={cls}>
      <Gavel className="h-3 w-3" /> {label}
    </Link>
  );
}

function MobileRow({ row, listings }: { row: Row; listings: ActiveListing[] }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <Link to="/market/$id" params={{ id: row.card.id }} className="flex min-w-0 flex-1 items-center gap-3">
        <Thumb card={row.card} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{row.card.cardName}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {row.card.setName} · {row.card.grade} · ขาย {row.count} ครั้ง
          </span>
        </span>
      </Link>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-sm font-bold tabular-nums">{formatThb(row.card.marketPrice ?? row.card.lastPrice)}</span>
        <Change value={row.change} />
        {listings.length > 0 && <ForSale listings={listings} />}
      </div>
    </div>
  );
}

function RecentSale({ sale, cards }: { sale: MarketSale; cards: MarketCard[] }) {
  const group = cards.find((c) => c.key === sale.key);
  return (
    <Link
      to="/market/$id"
      params={{ id: group?.id ?? sale.cardId }}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-secondary/50"
    >
      <SmartImage
        src={sale.imageUrl}
        alt={sale.cardName}
        transformWidth={80}
        wrapperClassName="h-11 w-8 shrink-0 overflow-hidden rounded-md bg-tile ring-1 ring-border"
        className="object-cover"
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-semibold">{sale.cardName}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{sale.grade}</span>
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-[13px] font-bold tabular-nums">{formatThb(sale.price)}</span>
        <span
          className={cn(
            "mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
            sale.isAuction ? "bg-[var(--cd-urgent)]/10 text-[var(--cd-urgent)]" : "bg-muted text-muted-foreground",
          )}
        >
          {sale.isAuction ? "ประมูล" : "ซื้อทันที"}
        </span>
        <span className="block text-[10.5px] text-muted-foreground">
          <ClientTimeAgo ms={sale.soldAt} />
        </span>
      </span>
    </Link>
  );
}

/** แสดงเวลาที่ผ่านมาเฉพาะฝั่ง client (กัน hydration ไม่ตรง) */
function ClientTimeAgo({ ms }: { ms: number }) {
  const [text, setText] = useState("");
  useEffect(() => setText(timeAgo(ms)), [ms]);
  return <>{text}</>;
}
