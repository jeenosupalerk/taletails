import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartLine,
  History,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart as RLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { PageShell } from "@/components/site/PageShell";
import { Badge } from "@/components/ui/badge";
import { LogoLoader } from "@/components/ui/logo-loader";
import { formatThb, rangeDays, type MarketRange } from "@/data/market";
import { historyInRange, useMarketCard, useMarketStats } from "@/hooks/useMarketStats";
import { CrossGradeTable } from "@/components/market/CrossGradeTable";
import { useActiveListings } from "@/hooks/useMarketListings";
import { diffVsMarket, timeAgo } from "@/lib/market-price";
import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";

const rangeLabels: { key: MarketRange; label: string }[] = [
  { key: "7d", label: "7 วัน" },
  { key: "1m", label: "1 เดือน" },
  { key: "1y", label: "1 ปี" },
];

const pageTitle = "สถิติราคาการ์ด — Taletails";
const pageDescription =
  "เจาะลึกกราฟราคา สถิติสูงสุด-ต่ำสุด ค่าเฉลี่ย และประวัติการซื้อขายจริงของการ์ดใบนี้บนตลาดกลาง Taletails";

export const Route = createFileRoute("/market/$id")({
  head: ({ params }) => ({
    meta: [
      { title: pageTitle },
      { name: "description", content: pageDescription },
      { property: "og:title", content: pageTitle },
      { property: "og:description", content: pageDescription },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/market/${params.id}` }],
  }),
  errorComponent: ({ error }) => (
    <div role="alert" className="p-8 text-center text-sm text-destructive">
      {error.message}
    </div>
  ),
  notFoundComponent: () => (
    <PageShell title="ไม่พบข้อมูลการ์ด" description="การ์ดใบนี้ยังไม่มีข้อมูลบนตลาดกลาง">
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
        ลองกลับไปที่หน้าสถิติตลาดเพื่อเลือกการ์ดอื่น
      </div>
    </PageShell>
  ),
  component: MarketDetailPage,
});

function MarketDetailPage() {
  const { id } = Route.useParams();
  const { card, isLoading } = useMarketCard(id);
  const { cards: allMarketCards } = useMarketStats();
  const { byKey: listingsByKey } = useActiveListings();
  const [tab, setTab] = useState<"chart" | "history">("chart");
  const [range, setRange] = useState<MarketRange>("1m");

  const chartData = useMemo(
    () =>
      historyInRange(card?.priceHistory ?? [], range).map((p) => ({
        date: p.date.slice(5).split("-").reverse().join("/"),
        price: p.price,
      })),
    [card?.priceHistory, range],
  );

  if (isLoading) {
    return (
      <PageShell title="สถิติการ์ด" description="กำลังโหลดข้อมูลการซื้อขายจริง">
        <div className="flex min-h-[50vh] items-center justify-center">
          <LogoLoader />
        </div>
      </PageShell>
    );
  }

  if (!card) {
    return (
      <PageShell title="ไม่พบข้อมูลการ์ด" description="การ์ดใบนี้ยังไม่มีรายการซื้อขายสำเร็จ">
        <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">
          เมื่อการ์ดใบนี้ถูกซื้อขายสำเร็จ ระบบจะแสดงกราฟราคาและประวัติที่นี่
        </div>
      </PageShell>
    );
  }

  // เทียบราคาขายล่าสุดกับราคาตลาด (เฉลี่ย 3 ครั้งล่าสุด)
  const diffVsAvg = card.marketPrice ? ((card.lastPrice - card.marketPrice) / card.marketPrice) * 100 : 0;
  const forSale = listingsByKey.get(card.key ?? "") ?? [];
  const up = diffVsAvg >= 0;
  const hasData = card.transactions.length > 0;

  return (

    <PageShell
      eyebrow={card.setName}
      title={card.cardName}
      description={`สถิติราคาและประวัติการซื้อขาย • เกรด ${card.grade}`}
    >
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {/* ส่วนหัว: ราคาตลาดของการ์ดรุ่นนี้ */}
        <div className="surface-panel flex flex-wrap items-center gap-4 p-4 sm:gap-6 sm:p-5">
          <SmartImage
            src={card.imageUrl}
            alt={card.cardName}
            transformWidth={220}
            priority
            wrapperClassName="h-28 w-20 shrink-0 overflow-hidden rounded-xl bg-tile ring-1 ring-border"
            className="object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground">
              {card.setName} · {card.grade}
            </p>
            <h2 className="mt-0.5 text-xl font-bold">{card.cardName}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              ขายแล้ว {card.totalSold} ครั้ง
              {card.lastSoldAt ? (
                <>
                  {" "}· ขายล่าสุด <ClientTimeAgo ms={card.lastSoldAt} />
                </>
              ) : null}
            </p>
          </div>
          <div className="w-full rounded-2xl bg-gradient-to-br from-primary/[0.07] to-card p-4 ring-1 ring-primary/25 sm:w-auto sm:min-w-[240px]">
            <p className="text-xs text-muted-foreground">ราคาตลาด (เฉลี่ย 3 ครั้งล่าสุด)</p>
            <p className="font-display text-3xl font-bold tracking-tight tabular-nums">
              {card.marketPrice ? formatThb(card.marketPrice) : "—"}
            </p>
            {card.marketPrice ? (
              <span
                className={cn(
                  "mt-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                  up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                ขายล่าสุด {formatThb(card.lastPrice)} ({up ? "+" : ""}
                {diffVsAvg.toFixed(1)}%)
              </span>
            ) : (
              <p className="mt-1 text-xs text-muted-foreground">ยังไม่มีการขายใน 90 วันที่ผ่านมา</p>
            )}
          </div>
        </div>

        {/* มีขาย/ประมูลอยู่ตอนนี้ */}
        {forSale.length > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-bold">มีขายอยู่ตอนนี้ · {forSale.length} ใบ</h3>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {forSale.slice(0, 6).map((l) => {
                const d = diffVsMarket(l.price, card.marketPrice);
                const inner = (
                  <>
                    <SmartImage
                      src={l.image}
                      alt={l.name}
                      transformWidth={100}
                      wrapperClassName="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-tile ring-1 ring-border"
                      className="object-cover"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block font-display text-base font-bold tabular-nums">{formatThb(l.price)}</span>
                      <span
                        className={cn(
                          "block truncate text-[11px]",
                          l.kind === "fixed" && d !== null && d <= -1 ? "font-semibold text-success" : "text-muted-foreground",
                        )}
                      >
                        {l.kind === "auction"
                          ? "ประมูล · ราคาปัจจุบัน"
                          : d === null
                            ? "ขายราคาปกติ"
                            : Math.abs(d) < 1
                              ? "ใกล้เคียงราคาตลาด"
                              : `${d < 0 ? "ถูกกว่า" : "สูงกว่า"}ราคาตลาด ${Math.abs(d).toFixed(0)}%`}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-lg bg-gradient-ember px-3 py-1.5 text-xs font-semibold text-primary-foreground">
                      {l.kind === "auction" ? "เข้าประมูล" : "ซื้อเลย"}
                    </span>
                  </>
                );
                const cls =
                  "flex items-center gap-3 rounded-2xl bg-card p-2 ring-1 ring-border transition-shadow hover:shadow-card";
                return l.kind === "auction" ? (
                  <Link key={l.cardId} to="/card/$id" params={{ id: l.cardId }} className={cls}>
                    {inner}
                  </Link>
                ) : (
                  <Link key={l.cardId} to="/product/$id" params={{ id: l.cardId }} className={cls}>
                    {inner}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* เทียบราคาการ์ดใบเดียวกันในแต่ละเกรด (SQC / PSA / BGS / Raw ...) */}
        <CrossGradeTable current={card} cards={allMarketCards} listingsByKey={listingsByKey} />

        {/* Key metrics */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="สูงสุดตลอดกาล (ATH)"
            value={formatThb(card.allTimeHigh)}
            icon={<TrendingUp className="h-4 w-4 text-success" />}
          />
          <MetricCard
            label="ต่ำสุดตลอดกาล (ATL)"
            value={formatThb(card.allTimeLow)}
            icon={<TrendingDown className="h-4 w-4 text-destructive" />}
          />
          <MetricCard label="ค่าเฉลี่ย 30 วัน" value={formatThb(card.avg30d)} />
          <MetricCard label="ขายแล้วทั้งหมด" value={`${card.totalSold} ใบ`} />
        </div>

        {/* Tabs */}
        <div className="flex min-h-11 items-center gap-1 rounded-xl border border-border bg-card p-1">
          <button
            type="button"
            onClick={() => setTab("chart")}
            aria-pressed={tab === "chart"}
            className={cn(
              "flex h-full flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              tab === "chart"
                ? "bg-gradient-ember text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary/60",
            )}
          >
            <ChartLine className="h-4 w-4" /> ดูกราฟราคา
          </button>
          <button
            type="button"
            onClick={() => setTab("history")}
            aria-pressed={tab === "history"}
            className={cn(
              "flex h-full flex-1 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors",
              tab === "history"
                ? "bg-gradient-ember text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary/60",
            )}
          >
            <History className="h-4 w-4" /> ประวัติการซื้อขาย
          </button>
        </div>

        {!hasData ? (
          <div className="surface-panel flex flex-col items-center gap-3 px-6 py-16 text-center">
            <ChartLine className="min-h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">ยังไม่มีข้อมูลการซื้อขายสำหรับการ์ดใบนี้บนตลาดกลาง</p>
            <p className="text-sm text-muted-foreground">
              เมื่อมีธุรกรรมเกิดขึ้น ระบบจะแสดงกราฟและประวัติที่นี่
            </p>
          </div>
        ) : tab === "chart" ? (
          <div className="surface-panel p-4 sm:p-5">
            {/* Range filter */}
            <div className="mb-4 flex min-h-10 items-center gap-1 self-start rounded-xl border border-border bg-background p-1 sm:inline-flex">
              {rangeLabels.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRange(r.key)}
                  aria-pressed={range === r.key}
                  className={cn(
                    "h-full rounded-lg px-4 text-sm font-semibold transition-colors",
                    range === r.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary/60",
                  )}
                >
                  {r.label}
                </button>
              ))}
              <span className="sr-only">
                แสดงข้อมูลย้อนหลัง {rangeDays[range]} วัน
              </span>
            </div>

            <div className="h-72 w-full sm:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RLineChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    dataKey="price"
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    tickLine={false}
                    axisLine={false}
                    width={64}
                    tickFormatter={(v: number) => `฿${v.toLocaleString("th-TH")}`}
                  />
                  <Tooltip
                    formatter={(value) => [formatThb(Number(value)), "ราคา"]}
                    labelFormatter={(label) => `วันที่ ${label}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid var(--border)",
                      background: "var(--card)",
                      color: "var(--foreground)",
                      fontSize: 13,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="#FF6A00"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 5, fill: "#FF6A00" }}
                  />
                </RLineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="surface-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium sm:px-5">วันที่</th>
                    <th className="px-2 py-3 font-medium">ประเภทธุรกรรม</th>
                    <th className="px-2 py-3 text-right font-medium">ราคาที่จบ</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {card.transactions.map((tx) => (
                    <tr key={tx.id} className="transition-colors hover:bg-secondary/50">
                      <td className="px-4 py-3 tabular-nums sm:px-5">
                        {new Date(tx.date).toLocaleDateString("th-TH", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-2 py-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "rounded-md",
                            tx.type === "auction"
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-foreground",
                          )}
                        >
                          {tx.type === "auction" ? "ประมูล" : "ซื้อขาด"}
                        </Badge>
                      </td>
                      <td className="px-2 py-3 text-right font-bold tabular-nums">
                        {formatThb(tx.price)}
                      </td>
                      <td className="px-4 py-3 text-right sm:px-5">
                        <span className="text-xs font-semibold text-success">เสร็จสิ้น</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </PageShell>
  );
}

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="surface-panel p-4">
      <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="mt-1.5 text-lg font-bold tracking-tight tabular-nums sm:text-xl">{value}</p>
    </div>
  );
}

/** แสดงเวลาที่ผ่านมาเฉพาะฝั่ง client (กัน hydration ไม่ตรง) */
function ClientTimeAgo({ ms }: { ms: number }) {
  const [text, setText] = useState("");
  useEffect(() => setText(timeAgo(ms)), [ms]);
  return <>{text}</>;
}
