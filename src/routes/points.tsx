import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Coins, RotateCcw } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { LogoLoader } from "@/components/ui/logo-loader";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { TT_VALUE_THB, usePointsBalance, usePointsHistory } from "@/hooks/usePoints";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-trade.com";
const title = "ประวัติแต้ม TT Points | Taletails";
const description =
  "ดูยอด TT Points คงเหลือ ประวัติการได้รับแต้มจากคำสั่งซื้อและการประมูล และการใช้แต้มเป็นส่วนลด";

export const Route = createFileRoute("/points")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/points` }],
  }),
  component: PointsPage,
});

function PointsPage() {
  const userId = useAuthUserId();
  const balance = usePointsBalance(userId ?? null);
  const history = usePointsHistory(userId ?? null);
  const rows = history.data ?? [];

  return (
    <PageShell title="TT Points" description="แต้มสะสมและประวัติการใช้แต้มของคุณ">
      <section className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {!userId ? (
          <div className="surface-panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Coins className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">
              เข้าสู่ระบบเพื่อดูแต้มสะสมและประวัติแต้มของคุณ
            </p>
            <Button
              asChild
              className="min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground"
            >
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : (
          <>
            <PointsBalanceCard points={balance.data ?? 0} />

            <div className="surface-panel overflow-hidden">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">ประวัติแต้ม</h2>
                <p className="text-xs text-muted-foreground">
                  ทุกยอดชำระ 25 บาท รับ 1 TT • ใช้ 1 TT เป็นส่วนลด 0.50 บาท
                </p>
              </div>

              {history.isLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <LogoLoader size={64} />
                </div>
              ) : rows.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="text-sm text-muted-foreground">ยังไม่มีประวัติแต้ม</p>
                  <Button asChild variant="secondary" className="mt-4 min-h-11 rounded-xl">
                    <Link to="/marketplace">เริ่มเลือกซื้อการ์ด</Link>
                  </Button>
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {rows.map((r) => {
                    const positive = r.points > 0;
                    const isRefund = r.kind === "refund" || r.kind === "release";
                    const Icon = isRefund ? RotateCcw : positive ? ArrowUpRight : ArrowDownRight;
                    return (
                      <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                        <span
                          className={cn(
                            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                            positive
                              ? "bg-primary/10 text-primary"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words">
                            {r.description ?? (positive ? "ได้รับแต้ม" : "ใช้แต้ม")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("th-TH", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                            {r.kind === "earn" ? ` • ยอดชำระ ${thb.format(Number(r.amount))}` : ""}
                            {r.kind === "redeem"
                              ? ` • ส่วนลด ${thb.format(Number(r.amount))}`
                              : ""}
                          </p>
                          {r.order_id && (
                            <Link
                              to="/order/$id"
                              params={{ id: r.order_id }}
                              className="mt-1 inline-block text-xs font-semibold text-primary underline underline-offset-4"
                            >
                              ดูคำสั่งซื้อ {r.order_id.slice(0, 8).toUpperCase()}
                            </Link>
                          )}
                        </div>
                        <span
                          className={cn(
                            "shrink-0 font-display text-sm font-bold tabular-nums",
                            positive ? "text-primary" : "text-muted-foreground",
                          )}
                        >
                          {positive ? "+" : ""}
                          {r.points} TT
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </section>
    </PageShell>
  );
}

/** การ์ดแสดงยอดแต้มคงเหลือแบบเด่นชัด */
export function PointsBalanceCard({
  points,
  compact = false,
}: {
  points: number;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-ember p-5 text-primary-foreground shadow-glow">
      <div className="absolute -top-10 -right-8 h-32 w-32 rounded-full bg-white/15 blur-2xl" />
      <div className="relative flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase opacity-90">
            <Coins className="h-4 w-4" /> TT Points
          </p>
          <p className="mt-1 font-display text-3xl leading-none font-extrabold tabular-nums">
            {points.toLocaleString("th-TH")}
          </p>
          <p className="mt-1.5 text-xs opacity-90">
            มูลค่าส่วนลด {thb.format(points * TT_VALUE_THB)}
          </p>
        </div>
        {!compact && (
          <Button
            asChild
            variant="secondary"
            className="min-h-10 shrink-0 rounded-xl text-sm font-semibold"
          >
            <Link to="/marketplace">ใช้แต้ม</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
