import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowDownRight, ArrowUpRight, Coins, Gift, Loader2, Package, RotateCcw, Sparkles, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { LogoLoader } from "@/components/ui/logo-loader";
import { SmartImage } from "@/components/ui/smart-image";
import { useAuthUserId } from "@/hooks/useCardDetail";
import {
  useMyRedemptions,
  usePointsBalance,
  usePointsHistory,
  useRedeemReward,
  useTtRewards,
  useTtSettings,
  type TtReward,
} from "@/hooks/usePoints";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-trade.com";
const title = "แต้มของฉัน TT Points | Taletails";
const description = "ดูยอด TT Points แลกของรางวัล และประวัติการได้รับและใช้แต้มของคุณ";

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

const dateTh = (iso: string) => new Date(iso).toLocaleDateString("th-TH", { dateStyle: "medium" });

function PointsPage() {
  const userId = useAuthUserId();
  const balance = usePointsBalance(userId ?? null);
  const history = usePointsHistory(userId ?? null);
  const { settings } = useTtSettings();
  const rewards = useTtRewards();
  const redemptions = useMyRedemptions(userId ?? null);
  const points = balance.data ?? 0;
  const rows = history.data ?? [];
  const waiting = (redemptions.data ?? []).filter((r) => r.status === "pending" || r.status === "attached");

  return (
    <PageShell title="แต้มของฉัน" description="TT Points สะสมจากการซื้อผ่าน Taletails">
      <section className="mx-auto max-w-2xl space-y-5 px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {!userId ? (
          <div className="surface-panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Coins className="h-10 w-10 text-primary" />
            <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อดูแต้มสะสมและแลกของรางวัล</p>
            <Button asChild className="min-h-11 rounded-xl font-semibold">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : (
          <>
            <PointsBalanceCard points={points} />

            {settings.v2_active && settings.cash_redeem_active && settings.cash_redeem_until && (
              <p className="rounded-2xl bg-secondary p-4 text-sm leading-relaxed">
                <b className="font-semibold">แต้มเดิมแปลงเป็นระบบใหม่แล้ว</b> มูลค่าเท่าเดิม · ใช้ TT
                ลดราคาตอนชำระเงินได้ถึงวันที่ {dateTh(settings.cash_redeem_until)} หลังจากนั้นใช้แลกของรางวัลแทน
              </p>
            )}

            {settings.v2_active && (
              <section className="space-y-3">
                <h2 className="font-display text-lg font-bold">แลกของรางวัล</h2>
                {rewards.isLoading ? (
                  <div className="flex h-32 items-center justify-center">
                    <LogoLoader size={48} />
                  </div>
                ) : (rewards.data ?? []).length === 0 ? (
                  <p className="rounded-2xl bg-card p-5 text-center text-sm text-muted-foreground ring-1 ring-border">
                    ของรางวัลกำลังมาเร็ว ๆ นี้ สะสม TT ไว้ก่อนได้เลย
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {(rewards.data ?? []).map((r) => (
                      <RewardRow key={r.id} reward={r} balance={points} bahtPerPoint={settings.baht_per_point} />
                    ))}
                  </ul>
                )}
              </section>
            )}

            {waiting.length > 0 && (
              <section className="space-y-2.5">
                <h2 className="font-display text-lg font-bold">รอส่งพร้อมคำสั่งซื้อถัดไป</h2>
                <ul className="space-y-2">
                  {waiting.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-primary/40 bg-card px-4 py-3 text-sm"
                    >
                      <span className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-primary" /> {w.reward_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {w.status === "attached" ? "แนบกับคำสั่งซื้อแล้ว" : `แลกเมื่อ ${dateTh(w.created_at)}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="overflow-hidden rounded-3xl bg-card ring-1 ring-border">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">ประวัติ TT</h2>
                <p className="text-xs text-muted-foreground">
                  ซื้อทุก {settings.baht_per_point} บาท ได้ 1 TT
                  {settings.promo_active ? ` · ตอนนี้ ${settings.promo_name ?? "โปรโมชั่น"} x${settings.promo_multiplier}` : ""}
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
                    const Icon = r.kind === "reward" ? Gift : isRefund ? RotateCcw : positive ? ArrowUpRight : ArrowDownRight;
                    return (
                      <li key={r.id} className="flex items-start gap-3 px-4 py-3">
                        <span
                          className={cn(
                            "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full",
                            positive ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium break-words">
                            {r.description ?? (positive ? "ได้รับแต้ม" : "ใช้แต้ม")}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })}
                            {r.kind === "earn" ? ` • ยอดชำระ ${thb.format(Number(r.amount))}` : ""}
                            {r.kind === "redeem" ? ` • ส่วนลด ${thb.format(Number(r.amount))}` : ""}
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
                          {r.points.toLocaleString("th-TH")} TT
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

/** ของรางวัล 1 รายการ — แต้มไม่พอจะเห็นแถบความคืบหน้าแทนปุ่มแลก */
function RewardRow({ reward, balance, bahtPerPoint }: { reward: TtReward; balance: number; bahtPerPoint: number }) {
  const redeem = useRedeemReward();
  const enough = balance >= reward.points_cost;
  const missing = Math.max(0, reward.points_cost - balance);
  const HowIcon = reward.fulfillment === "free_shipping_coupon" ? Truck : Package;

  return (
    <li className="flex items-center gap-3 rounded-2xl bg-card p-3 ring-1 ring-border">
      <span className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary text-primary">
        {reward.image_url ? (
          <SmartImage src={reward.image_url} alt="" transformWidth={160} className="object-cover" />
        ) : (
          <Gift className="h-6 w-6" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold">{reward.name}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <HowIcon className="h-3.5 w-3.5" />
          {reward.fulfillment === "free_shipping_coupon" ? "ใช้ได้ตอนชำระเงินครั้งถัดไป" : "ส่งไปพร้อมคำสั่งซื้อถัดไป"}
        </p>
        <p className="mt-0.5 font-display text-base font-bold text-primary">
          {reward.points_cost.toLocaleString("th-TH")} TT
        </p>
        {!enough && reward.in_stock && (
          <>
            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full bg-primary"
                style={{ width: `${Math.min(100, (balance / reward.points_cost) * 100)}%` }}
              />
            </span>
            <p className="mt-1 text-[11px] text-muted-foreground">
              อีก {missing.toLocaleString("th-TH")} TT (ซื้ออีกประมาณ {thb.format(missing * bahtPerPoint)})
            </p>
          </>
        )}
      </div>
      {!reward.in_stock ? (
        <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">หมดแล้ว</span>
      ) : enough ? (
        <ConfirmDialog
          title={`แลก ${reward.name}`}
          description={`ใช้ ${reward.points_cost.toLocaleString("th-TH")} TT ${
            reward.fulfillment === "free_shipping_coupon"
              ? "รับคูปองส่งฟรีสำหรับการชำระเงินครั้งถัดไป"
              : "ของรางวัลจะถูกส่งไปพร้อมคำสั่งซื้อถัดไปของคุณ"
          } · แลกแล้วคืนแต้มไม่ได้`}
          confirmLabel="ยืนยันแลก"
          disabled={redeem.isPending}
          onConfirm={() =>
            redeem.mutate(reward.id, {
              onSuccess: () => toast.success("แลกของรางวัลแล้ว", { description: reward.name }),
              onError: (e) => toast.error(e.message),
            })
          }
          trigger={
            <Button className="min-h-11 shrink-0 rounded-xl px-4 font-semibold" disabled={redeem.isPending}>
              {redeem.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              แลก
            </Button>
          }
        />
      ) : null}
    </li>
  );
}

/** ยอดแต้มคงเหลือ — โทนเข้มเหมือนป้ายเกรด ให้ต่างจากปุ่มสีส้ม (ใช้ในหน้าโปรไฟล์ด้วย) */
export function PointsBalanceCard({ points, compact = false }: { points: number; compact?: boolean }) {
  const { settings } = useTtSettings();
  return (
    <div className="rounded-3xl bg-foreground p-5 text-background">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold opacity-80">
            <Coins className="h-4 w-4" /> TT ที่มีอยู่
          </p>
          <p className="mt-1 font-display text-4xl leading-none font-extrabold tabular-nums">
            {points.toLocaleString("th-TH")} <span className="text-lg font-semibold">TT</span>
          </p>
          <p className="mt-2 text-xs opacity-80">
            {settings.promo_active ? (
              <span className="inline-flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> {settings.promo_name ?? "โปรโมชั่น"} ได้แต้ม x{settings.promo_multiplier}
              </span>
            ) : (
              `ซื้อทุก ${settings.baht_per_point} บาท ได้ 1 TT`
            )}
          </p>
        </div>
        {compact && (
          <Button asChild variant="secondary" className="min-h-11 shrink-0 rounded-xl text-sm font-semibold">
            <Link to="/points">{settings.v2_active ? "แลกของรางวัล" : "ดูประวัติ"}</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
