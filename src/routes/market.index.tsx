import { Link, createFileRoute } from "@tanstack/react-router";
import { Activity, ArrowDownRight, ArrowUpRight, LineChart, TrendingUp } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { Skeleton } from "@/components/ui/skeleton";
import { formatThb } from "@/data/market";
import { useMarketStats } from "@/hooks/useMarketStats";
import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "สถิติตลาด — Taletails";
const description =
  "ติดตามราคาและเทรนด์การ์ดสะสมแบบเรียลไทม์ มูลค่าซื้อขายรวม การ์ดมาแรง และสถิติตลาดกลางของ Taletails";

export const Route = createFileRoute("/market/")({
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

function MarketPage() {
  const { summary, cards: marketCards, isLoading: loading } = useMarketStats();
  const marketSummary = summary;
  const volumeUp = marketSummary.volumeChange24h >= 0;

  return (
    <PageShell
      eyebrow="Market Statistics"
      title="สถิติตลาดการ์ด"
      description="ภาพรวมมูลค่าและเทรนด์ราคาการ์ดสะสมบนตลาดกลาง คำนวณจากรายการที่ซื้อขายสำเร็จจริง"
    >
      <section className="mx-auto max-w-7xl space-y-6 px-4 py-6 pb-28 sm:px-6 lg:px-8">

        {/* Top metrics */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="surface-panel flex items-center gap-4 p-5">
            <span className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUp className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">มูลค่าการซื้อขายรวม</p>
              <p className="text-2xl font-bold tracking-tight">
                {formatThb(marketSummary.totalVolume)}
              </p>
              <p
                className={cn(
                  "mt-0.5 flex items-center gap-1 text-xs font-semibold",
                  volumeUp ? "text-success" : "text-destructive",
                )}
              >
                {volumeUp ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
                {volumeUp ? "+" : ""}
                {marketSummary.volumeChange24h}% จากเมื่อวาน
              </p>

            </div>
          </div>
          <div className="surface-panel flex items-center gap-4 p-5">
            <span className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-medium text-muted-foreground">ธุรกรรมทั้งหมด</p>
              <p className="text-2xl font-bold tracking-tight">
                {marketSummary.totalTransactions.toLocaleString("th-TH")}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">สะสมตั้งแต่เปิดตลาดกลาง</p>
            </div>
          </div>
        </div>

        {/* Top traded table */}
        <div className="surface-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <LineChart className="h-5 w-5 text-primary" />
              <h2 className="text-base font-bold">การ์ดมาแรง / ซื้อขายสูงสุด</h2>
            </div>
            <span className="text-xs text-muted-foreground">24 ชม. ล่าสุด</span>
          </div>

          {loading ? (
            <div className="space-y-1 p-2" aria-busy="true" aria-label="กำลังโหลดข้อมูลตลาด">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                  <Skeleton className="h-5 w-6" />
                  <Skeleton className="min-h-12 w-9 rounded-md" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-14" />
                </div>
              ))}
            </div>
          ) : marketCards.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <LineChart className="min-h-10 w-10 text-muted-foreground/50" />
              <p className="font-semibold">ยังไม่มีรายการซื้อขายสำเร็จบนตลาดกลาง</p>
              <p className="text-sm text-muted-foreground">
                เมื่อมีการชำระเงินเรียบร้อย ระบบจะสรุปราคาและสถิติที่นี่ทันที
              </p>
            </div>
          ) : (

            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-medium sm:px-5">#</th>
                    <th className="px-2 py-3 font-medium">การ์ด</th>
                    <th className="px-2 py-3 text-right font-medium">ราคาล่าสุด</th>
                    <th className="px-2 py-3 text-right font-medium">24 ชม.</th>
                    <th className="px-4 py-3 text-right font-medium sm:px-5">ปริมาณซื้อขาย</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {marketCards.map((card, i) => {
                    const up = card.change24h >= 0;
                    return (
                      <tr key={card.id} className="group transition-colors hover:bg-secondary/50">
                        <td className="px-4 py-3 font-semibold text-muted-foreground sm:px-5">
                          <Link
                            to="/market/$id"
                            params={{ id: card.id }}
                            className="block"
                            aria-label={`ดูสถิติ ${card.cardName}`}
                          >
                            {i + 1}
                          </Link>
                        </td>
                        <td className="px-2 py-3">
                          <Link
                            to="/market/$id"
                            params={{ id: card.id }}
                            className="flex items-center gap-3"
                          >
                            <SmartImage
                              src={card.imageUrl}
                              alt={card.cardName}
                              transformWidth={120}
                              wrapperClassName="min-h-12 w-9 shrink-0 rounded-md border border-border"
                              className="object-cover"
                            />
                            <span className="min-w-0">
                              <span className="block truncate font-semibold group-hover:text-primary">
                                {card.cardName}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {card.setName} • {card.grade}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-2 py-3 text-right font-bold tabular-nums">
                          <Link to="/market/$id" params={{ id: card.id }} className="block">
                            {formatThb(card.lastPrice)}
                          </Link>
                        </td>
                        <td className="px-2 py-3 text-right">
                          <Link
                            to="/market/$id"
                            params={{ id: card.id }}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                              up ? "text-success" : "text-destructive",
                            )}
                          >
                            {up ? (
                              <ArrowUpRight className="h-3.5 w-3.5" />
                            ) : (
                              <ArrowDownRight className="h-3.5 w-3.5" />
                            )}
                            {up ? "+" : ""}
                            {card.change24h.toFixed(1)}%
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-muted-foreground sm:px-5">
                          <Link to="/market/$id" params={{ id: card.id }} className="block">
                            {card.volume24h} รายการ
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
