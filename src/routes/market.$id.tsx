import { createFileRoute, notFound } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartLine,
  History,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
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
import {
  formatThb,
  getMarketCardById,
  rangeDays,
  sliceHistory,
  type MarketRange,
} from "@/data/market";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";

const rangeLabels: { key: MarketRange; label: string }[] = [
  { key: "7d", label: "7 วัน" },
  { key: "1m", label: "1 เดือน" },
  { key: "1y", label: "1 ปี" },
];

export const Route = createFileRoute("/market/$id")({
  loader: ({ params }) => {
    const card = getMarketCardById(params.id);
    if (!card) throw notFound();
    return card;
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.cardName} — สถิติตลาด | Taletails`
      : "ไม่พบข้อมูลการ์ด | Taletails";
    const description = loaderData
      ? `เจาะลึกราคา ${loaderData.cardName} (${loaderData.grade}) กราฟราคา สถิติสูงสุด-ต่ำสุด และประวัติการซื้อขายบนตลาดกลาง`
      : "ไม่พบข้อมูลสถิติตลาดสำหรับการ์ดใบนี้";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: loaderData
        ? [{ rel: "canonical", href: `${SITE_URL}/market/${loaderData.id}` }]
        : [],
    };
  },
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
  const card = Route.useLoaderData();
  const [tab, setTab] = useState<"chart" | "history">("chart");
  const [range, setRange] = useState<MarketRange>("1m");

  const diffVsAvg = ((card.lastPrice - card.avg30d) / card.avg30d) * 100;
  const up = diffVsAvg >= 0;
  const hasData = card.priceHistory.length > 1 && card.transactions.length > 0;

  const chartData = useMemo(
    () =>
      sliceHistory(card.priceHistory, range).map((p) => ({
        date: p.date.slice(5).split("-").reverse().join("/"),
        price: p.price,
      })),
    [card.priceHistory, range],
  );

  return (
    <PageShell
      eyebrow={card.setName}
      title={card.cardName}
      description={`สถิติราคาและประวัติการซื้อขาย • เกรด ${card.grade}`}
    >
      <section className="mx-auto max-w-5xl space-y-6 px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {/* Stock-style header */}
        <div className="surface-panel flex flex-wrap items-center gap-4 p-5 sm:gap-6">
          <img
            src={card.imageUrl}
            alt={card.cardName}
            className="h-28 w-[84px] rounded-xl border border-border object-cover"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold">{card.cardName}</h2>
              <Badge variant="secondary" className="rounded-md">{card.grade}</Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{card.setName}</p>
            <div className="mt-2 flex flex-wrap items-end gap-3">
              <p className="text-3xl font-bold tracking-tight tabular-nums">
                {formatThb(card.lastPrice)}
              </p>
              <span
                className={cn(
                  "mb-1 inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold tabular-nums",
                  up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive",
                )}
              >
                {up ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {up ? "+" : ""}
                {diffVsAvg.toFixed(2)}% เทียบค่าเฉลี่ย 30 วัน
              </span>
            </div>
          </div>
        </div>

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
        <div className="flex h-11 items-center gap-1 rounded-xl border border-border bg-card p-1">
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
            <ChartLine className="h-10 w-10 text-muted-foreground/50" />
            <p className="font-semibold">ยังไม่มีข้อมูลการซื้อขายสำหรับการ์ดใบนี้บนตลาดกลาง</p>
            <p className="text-sm text-muted-foreground">
              เมื่อมีธุรกรรมเกิดขึ้น ระบบจะแสดงกราฟและประวัติที่นี่
            </p>
          </div>
        ) : tab === "chart" ? (
          <div className="surface-panel p-4 sm:p-5">
            {/* Range filter */}
            <div className="mb-4 flex h-10 items-center gap-1 self-start rounded-xl border border-border bg-background p-1 sm:inline-flex">
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
