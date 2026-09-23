import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import {
  BadgeCheck,
  Gavel,
  Loader2,
  Lock,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react";
import { CardGallery } from "@/components/card/CardGallery";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/site/BackButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { UserAvatar } from "@/components/site/UserAvatar";
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
  useMyPendingOrder,
  usePlaceBid,
} from "@/hooks/useCardDetail";
import { useCountdown } from "@/hooks/useCountdown";
import { FlipCountdown } from "@/components/site/FlipCountdown";
import { AUCTION_OUTCOME_TONE_CLASS, getAuctionOutcome } from "@/lib/auction-status";
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

  // Anti-sniping: ฐานข้อมูลจะยืดเวลาปิดประมูลอัตโนมัติเมื่อมีการเคาะราคาในช่วงวินาทีสุดท้าย
  // (ดู trg_bids_apply ใน Supabase) — ฝั่งนี้แค่คอยเทียบเวลาที่เปลี่ยนแล้วแจ้งเตือนผู้ดูสด
  const prevEndTimeRef = useRef<string | null>(null);
  useEffect(() => {
    if (!auction?.end_time) return;
    const prev = prevEndTimeRef.current;
    if (prev && new Date(auction.end_time).getTime() > new Date(prev).getTime()) {
      toast(`⏱️ ต่อเวลาประมูลอัตโนมัติ! เพราะมีการเสนอราคาในช่วงวินาทีสุดท้าย`);
    }
    prevEndTimeRef.current = auction.end_time;
  }, [auction?.end_time]);

  const outcome =
    auction && card
      ? getAuctionOutcome(auction.status, card.status, auction.end_time, Number(auction.bid_count))
      : null;


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

  // สินค้าราคาปกติที่ผู้ใช้คนนี้จองไว้และยังไม่จ่าย -> พาไปหน้าชำระเงินรายการเดิม
  const myPending = useMyPendingOrder(card && !isAuction ? id : undefined);
  const pendingOrderId = myPending.data?.id ?? null;
  useEffect(() => {
    if (!pendingOrderId) return;
    toast.info("คุณมีคำสั่งซื้อที่รอชำระสำหรับสินค้านี้ กำลังพาไปหน้าชำระเงิน");
    void navigate({ to: "/checkout/$id", params: { id: pendingOrderId }, replace: true });
  }, [pendingOrderId, navigate]);

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

  if (cardQuery.isLoading || pendingOrderId) {
    return (
      <Shell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <LogoLoader size={64} />
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
          className="mt-6 inline-flex min-h-10 items-center rounded-full border border-border px-5 text-sm font-medium"
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
  return (
    <div className="min-h-screen bg-background">
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
            grade={card.grade}
            gradingCompany={card.grading_company}
            condition={card.condition}
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
              {isAuction && outcome && (
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 font-semibold",
                    AUCTION_OUTCOME_TONE_CLASS[outcome.tone],
                  )}
                >
                  {outcome.label}
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
                  <div className="mt-5 border-t border-dashed border-border pt-5">
                    <FlipCountdown
                      endTime={auction.end_time}
                      startTime={auction.start_time}
                      closed={closed}
                      closedLabel={outcome?.label}
                    />
                  </div>

                  {!closed && countdown && countdown.totalMs < 5 * 60 * 1000 && (
                    <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-[11px] font-medium text-primary">
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      กันแซงวินาทีสุดท้าย: เคาะราคาตอนนี้ ระบบจะต่อเวลาให้อัตโนมัติอีก 2 นาที
                    </p>
                  )}

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
                    <div id="bid-form" className="mt-6 flex scroll-mt-28 flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        id="bid-amount"
                        aria-label="จำนวนเงินที่ต้องการเสนอ"
                        value={amount}
                        min={minNext}
                        step={Number(auction.bid_increment)}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="min-h-11 min-w-0 flex-1 rounded-xl text-base font-medium"
                      />
                      <Button
                        variant="secondary"
                        className="min-h-11 rounded-xl px-3 text-xs"
                        onClick={() => setAmount((a) => a + Number(auction.bid_increment))}
                      >
                        +{thb.format(Number(auction.bid_increment))}
                      </Button>
                      <ConfirmDialog
                        title="ยืนยันการเสนอราคา"
                        description={`คุณกำลังเสนอราคา ${thb.format(amount)} สำหรับการ์ดนี้ การเสนอราคาไม่สามารถยกเลิกได้`}
                        confirmLabel="เสนอราคา"
                        disabled={placeBid.isPending}
                        onConfirm={submitBid}
                        trigger={
                          <Button
                            className="min-h-11 w-full rounded-xl sm:w-auto"
                            disabled={placeBid.isPending}
                          >
                            {placeBid.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Gavel className="h-4 w-4" />
                            )}
                            เสนอราคา
                          </Button>
                        }
                      />
                    </div>
                  ) : (
                    <div className="mt-6 space-y-3">
                      <Button disabled className="min-h-11 w-full rounded-xl">
                        <Lock className="h-4 w-4" />
                        {outcome?.label ?? "ปิดประมูลแล้ว"}
                      </Button>
                      {outcome?.hint && (
                        <p className="text-center text-xs text-muted-foreground">{outcome.hint}</p>
                      )}
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
                  {card.stock_quantity !== null && card.is_published && (
                    <p
                      className={cn(
                        "mb-3 text-xs font-medium",
                        card.stock_quantity > 0 ? "text-muted-foreground" : "text-destructive",
                      )}
                    >
                      {card.stock_quantity > 0
                        ? `เหลือ ${card.stock_quantity} ชิ้น`
                        : card.status === "locked"
                          ? "ชิ้นสุดท้ายถูกจองอยู่ รอผู้ซื้อชำระเงิน"
                          : "สินค้าหมด"}
                    </p>
                  )}
                  <ConfirmDialog
                    title="ยืนยันการซื้อการ์ด"
                    description={`ยืนยันซื้อ "${card.name}" ราคา ${thb.format(Number(card.price ?? 0))} ระบบจะจองสินค้าไว้ให้คุณและพาไปหน้าชำระเงิน`}
                    confirmLabel="ซื้อเลย"
                    disabled={buyNow.isPending || card.status !== "available" || !card.is_published}
                    onConfirm={submitBuyNow}
                    trigger={
                      <Button
                        className="min-h-11 w-full rounded-xl"
                        disabled={buyNow.isPending || card.status !== "available" || !card.is_published}
                      >
                        {buyNow.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" />
                        )}
                        {!card.is_published
                          ? "สินค้านี้ยังไม่เปิดขาย"
                          : card.status === "available"
                            ? "ซื้อเลย"
                            : card.stock_quantity === 0 && card.status === "sold"
                              ? "สินค้าหมด"
                              : "การ์ดนี้ไม่พร้อมขาย"}
                      </Button>
                    }
                  />
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
              <div className="flex items-center justify-between gap-6 border-b border-border/60 py-3 last:border-0">
                <dt className="text-[13px] tracking-wide text-muted-foreground">ผู้ขาย</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <UserAvatar
                    name={card.users?.username ?? "Taletails Store"}
                    src={card.users?.avatar_url}
                    className="h-7 w-7 shrink-0"
                    fallbackClassName="text-[10px]"
                  />
                  <span className="truncate text-[13px] font-medium">
                    {card.users?.username ?? "Taletails Store"}
                  </span>
                </dd>
              </div>
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
                    <div key={b.id} className="flex items-center justify-between gap-3 px-4 py-3">
                      <UserAvatar
                        name={b.users?.username ?? "ผู้ประมูล"}
                        src={b.users?.avatar_url}
                        className="h-8 w-8 shrink-0"
                        fallbackClassName="text-[10px]"
                      />
                      <div className="min-w-0 flex-1">
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

      {/* แถบล่างบนมือถือ: ราคา + ปุ่มหลัก (เมนูล่างของเว็บถูกซ่อนในหน้านี้) */}
      {((isAuction && auction && !closed) || (!isAuction && card.status === "available" && card.is_published)) && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] text-muted-foreground">{isAuction ? "ราคาปัจจุบัน" : "ราคาขาย"}</p>
              <p className="truncate font-display text-xl leading-tight font-bold tabular-nums">{thb.format(price)}</p>
            </div>
            {isAuction ? (
              <Button
                className="min-h-12 flex-1 rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
                onClick={() => {
                  document.getElementById("bid-form")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  window.setTimeout(() => document.getElementById("bid-amount")?.focus({ preventScroll: true }), 350);
                }}
              >
                <Gavel className="h-4 w-4" /> เสนอราคา
              </Button>
            ) : (
              <ConfirmDialog
                title="ยืนยันการซื้อการ์ด"
                description={`ยืนยันซื้อ "${card.name}" ราคา ${thb.format(Number(card.price ?? 0))} ระบบจะจองสินค้าไว้ให้คุณและพาไปหน้าชำระเงิน`}
                confirmLabel="ซื้อเลย"
                disabled={buyNow.isPending}
                onConfirm={submitBuyNow}
                trigger={
                  <Button
                    className="min-h-12 flex-1 rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
                    disabled={buyNow.isPending}
                  >
                    {buyNow.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingBag className="h-4 w-4" />}
                    ซื้อเลย
                  </Button>
                }
              />
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
