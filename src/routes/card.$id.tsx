import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  Gavel,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingBag,
  Timer,
  TrendingUp,
} from "lucide-react";
import { CardGallery } from "@/components/card/CardGallery";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/site/BackButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  useAuctionRealtime,
  useAuthUserId,
  useBids,
  useBuyNow,
  useCard,
  useCardAuction,
  useClaimAuctionWin,
  usePlaceBid,
} from "@/hooks/useCardDetail";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
/** Stable placeholder so the countdown hook is not re-armed on every render. */
const FAR_FUTURE = "2999-01-01T00:00:00.000Z";
const title = "รายละเอียดการ์ด — Taletails";
const description =
  "ดูรายละเอียดการ์ดสะสม เกรด ใบรับรอง ราคาประมูลแบบเรียลไทม์ และซื้อขาดได้ทันทีบน Taletails";

export const Route = createFileRoute("/card/$id")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/card` }],
  }),
  component: CardDetailPage,
});

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 border-b border-border/60 py-3 last:border-0">
      <dt className="text-[13px] tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-right text-[13px] font-medium text-foreground">{value}</dd>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      <SiteFooter />
    </div>
  );
}

function CardDetailPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const userId = useAuthUserId();

  const cardQuery = useCard(id);
  const card = cardQuery.data ?? null;
  const isAuction = card?.sale_type === "auction";

  const auctionQuery = useCardAuction(id, Boolean(isAuction));
  const auction = auctionQuery.data ?? null;
  useAuctionRealtime(auction?.id);
  const bidsQuery = useBids(auction?.id);

  const countdown = useCountdown(auction?.end_time ?? FAR_FUTURE);
  const closed =
    !!auction && (auction.status !== "active" || (!!countdown && countdown.isFinished));

  const minNext = auction
    ? auction.bid_count === 0
      ? Number(auction.starting_price)
      : Number(auction.current_price) + Number(auction.bid_increment)
    : 0;

  const [amount, setAmount] = useState<number>(0);
  useEffect(() => {
    if (minNext > 0) setAmount(minNext);
  }, [minNext]);

  const images = useMemo(
    () => (card?.images?.length ? card.images : ["/taletails-logo.jpg"]),
    [card?.images],
  );

  const placeBid = usePlaceBid(auction?.id);
  const buyNow = useBuyNow();
  const claimWin = useClaimAuctionWin();

  const isWinner = !!auction && closed && !!userId && auction.winner_id === userId;

  // Winner is routed to checkout as soon as the auction closes.
  useEffect(() => {
    if (!isWinner || !auction) return;
    claimWin.mutate(auction.id, {
      onSuccess: (order) => {
        toast.success("คุณชนะการประมูล! กำลังไปหน้าชำระเงิน");
        void navigate({ to: "/checkout/$id", params: { id: order.id } });
      },
      onError: (e) => toast.error(e.message),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWinner, auction?.id]);

  if (cardQuery.isLoading) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </Shell>
    );
  }

  if (!card) {
    return (
      <Shell>
        <BackButton className="mb-6" />
        <h1 className="font-display text-2xl font-semibold">ไม่พบการ์ดใบนี้</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          การ์ดอาจถูกลบหรือปิดการขายไปแล้ว
        </p>
        <Link
          to="/marketplace"
          className="mt-6 inline-flex h-10 items-center rounded-full border border-border px-5 text-sm font-medium"
        >
          กลับไปตลาดซื้อขาย
        </Link>
      </Shell>
    );
  }

  const submitBid = () => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบก่อนเสนอราคา");
      void navigate({ to: "/auth" });
      return;
    }
    if (amount < minNext) {
      toast.error(`ต้องเสนออย่างน้อย ${thb.format(minNext)}`);
      return;
    }
    placeBid.mutate(
      { amount, userId },
      {
        onSuccess: () => toast.success(`เสนอราคา ${thb.format(amount)} สำเร็จ`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const submitBuyNow = () => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ");
      void navigate({ to: "/auth" });
      return;
    }
    buyNow.mutate(card.id, {
      onSuccess: (order) => {
        toast.success("จองการ์ดสำเร็จ กำลังไปหน้าชำระเงิน");
        void navigate({ to: "/checkout/$id", params: { id: order.id } });
      },
      onError: (e) => toast.error(e.message),
    });
  };

  const price = isAuction ? Number(auction?.current_price ?? card.price) : Number(card.price);
  const timeParts = countdown
    ? [
        { v: pad(countdown.days * 24 + countdown.hours), l: "ชั่วโมง" },
        { v: pad(countdown.minutes), l: "นาที" },
        { v: pad(countdown.seconds), l: "วินาที" },
      ]
    : [
        { v: "--", l: "ชั่วโมง" },
        { v: "--", l: "นาที" },
        { v: "--", l: "วินาที" },
      ];

  return (
    <div className="min-h-screen bg-background pb-28 lg:pb-0">
      <SiteHeader />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <BackButton className="mb-6" />

        <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Gallery */}
          <CardGallery
            images={images}
            alt={`${card.name} ${card.grade ?? ""}`}
            liveAuction={isAuction && !closed}
            status={card.status}
            gradeBadge={
              card.grade
                ? `${card.grading_company ? `${card.grading_company} ` : ""}${card.grade}`
                : undefined
            }
          />

          {/* Detail */}
          <section className="lg:pt-2">
            <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
              {card.set_name ?? "TALETAILS COLLECTION"}
            </p>
            <h1 className="mt-3 font-display text-3xl leading-tight font-semibold sm:text-4xl">
              {card.name}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
              {card.grade && (
                <span className="rounded-full border border-border px-3 py-1 font-medium">
                  {card.grading_company ? `${card.grading_company} ` : ""}
                  {card.grade}
                </span>
              )}
              {card.certification_no && (
                <span className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 font-medium text-primary">
                  <BadgeCheck className="h-3.5 w-3.5" />
                  ตรวจสอบแล้ว
                </span>
              )}
              {card.rarity && (
                <span className="rounded-full border border-border px-3 py-1 font-medium">
                  {card.rarity}
                </span>
              )}
            </div>

            {/* Price block */}
            <div className="mt-8 rounded-[24px] border border-border/70 bg-card p-6 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)]">
              <p className="text-[12px] tracking-wide text-muted-foreground">
                {isAuction ? "ราคาประมูลปัจจุบัน" : "ราคาขาย"}
              </p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight">
                {thb.format(price)}
              </p>

              {isAuction && auction && (
                <>
                  <div className="mt-5 flex items-center justify-between gap-4 border-t border-dashed border-border pt-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Timer className="h-4 w-4" />
                      {closed ? "ปิดประมูลแล้ว" : "เหลือเวลา"}
                    </div>
                    {!closed && (
                      <div className="flex items-end gap-2 tabular-nums">
                        {timeParts.map((p, i) => (
                          <div key={p.l} className="flex items-end gap-2">
                            {i > 0 && <span className="pb-1 text-lg opacity-40">:</span>}
                            <div className="text-center">
                              <div className="font-display text-2xl leading-none font-semibold">
                                {p.v}
                              </div>
                              <div className="mt-1 text-[10px] text-muted-foreground">{p.l}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">เสนอราคาไปแล้ว</p>
                      <p className="mt-0.5 font-display text-base font-semibold">
                        {auction.bid_count} ครั้ง
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ขั้นต่ำครั้งถัดไป</p>
                      <p className="mt-0.5 font-display text-base font-semibold">
                        {thb.format(minNext)}
                      </p>
                    </div>
                  </div>

                  {!closed ? (
                    <div className="mt-6 flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        aria-label="จำนวนเงินที่ต้องการเสนอ"
                        value={amount}
                        min={minNext}
                        step={Number(auction.bid_increment)}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="h-11 min-w-0 flex-1 rounded-xl text-base font-medium"
                      />
                      <Button
                        variant="secondary"
                        className="h-11 rounded-xl px-3 text-xs"
                        onClick={() => setAmount((a) => a + Number(auction.bid_increment))}
                      >
                        +{thb.format(Number(auction.bid_increment))}
                      </Button>
                      <Button
                        className="h-11 w-full rounded-xl sm:w-auto"
                        onClick={submitBid}
                        disabled={placeBid.isPending}
                      >
                        {placeBid.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Gavel className="h-4 w-4" />
                        )}
                        เสนอราคา
                      </Button>
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      <Button disabled className="h-11 w-full rounded-xl">
                        <Lock className="h-4 w-4" />
                        ปิดประมูลแล้ว
                      </Button>
                      {isWinner && (
                        <p className="text-center text-xs text-primary">
                          คุณเป็นผู้ชนะ — กำลังพาไปหน้าชำระเงิน
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {!isAuction && (
                <div className="mt-6">
                  <Button
                    className="h-11 w-full rounded-xl"
                    onClick={submitBuyNow}
                    disabled={buyNow.isPending || card.status !== "available"}
                  >
                    {buyNow.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="h-4 w-4" />
                    )}
                    {card.status === "available" ? "ซื้อเลย" : "การ์ดนี้ไม่พร้อมขาย"}
                  </Button>
                  <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    ระบบตรวจสอบสถานะการ์ดอีกครั้งตอนกดซื้อ เพื่อป้องกันการซื้อซ้อน
                  </p>
                </div>
              )}
            </div>

            {/* Specs */}
            <dl className="mt-10">
              <h2 className="mb-2 font-display text-sm tracking-[0.16em] uppercase">
                ข้อมูลการ์ด
              </h2>
              <Spec label="ชุด" value={card.set_name ?? "-"} />
              <Spec label="หมายเลขการ์ด" value={card.card_no ?? "-"} />
              <Spec label="ภาษา" value={card.language ?? "-"} />
              <Spec label="ปี" value={card.year ? String(card.year) : "-"} />
              <Spec label="สภาพ" value={card.condition ?? "-"} />
              <Spec label="สถาบันเกรด" value={card.grading_company ?? "-"} />
              <Spec label="เลขใบรับรอง" value={card.certification_no ?? "-"} />
              <Spec label="ผู้ขาย" value={card.users?.username ?? "Taletails Store"} />
            </dl>

            {card.details && (
              <div className="mt-8">
                <h2 className="mb-2 font-display text-sm tracking-[0.16em] uppercase">
                  รายละเอียดจากผู้ขาย
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">{card.details}</p>
              </div>
            )}

            {/* Live bid feed */}
            {isAuction && auction && (
              <div className="mt-10">
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm tracking-[0.16em] uppercase">
                  <TrendingUp className="h-4 w-4" />
                  ประวัติการเสนอราคา
                </h2>
                <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/70">
                  {(bidsQuery.data ?? []).length === 0 && (
                    <p className="px-4 py-5 text-center text-xs text-muted-foreground">
                      ยังไม่มีการเสนอราคา
                    </p>
                  )}
                  {(bidsQuery.data ?? []).map((b, i) => (
                    <div key={b.id} className="flex items-center justify-between px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {b.users?.username ?? "ผู้ประมูล"}
                          {i === 0 && (
                            <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                              สูงสุด
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(b.created_at).toLocaleString("th-TH")}
                        </p>
                      </div>
                      <p className="font-display text-sm font-semibold tabular-nums">
                        {thb.format(Number(b.amount))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
