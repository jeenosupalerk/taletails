import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import {
  BadgeCheck,
  Gavel,
  CircleAlert,
  CircleCheck,
  Loader2,
  Lock,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Zap,
} from "lucide-react";
import { CardGallery } from "@/components/card/CardGallery";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { BackButton } from "@/components/site/BackButton";
import {
  SITE_URL,
  absoluteImage,
  breadcrumbJsonLd,
  clip,
  fetchSeoCard,
  gradeLabel,
} from "@/lib/seo";
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
import { formatCountdownTh, useCountdown } from "@/hooks/useCountdown";
import { FlipCountdown } from "@/components/site/FlipCountdown";
import { NotifyWhenOpenButton, UpcomingCountdown } from "@/components/site/UpcomingCountdown";
import { AUCTION_OUTCOME_TONE_CLASS, getAuctionOutcome } from "@/lib/auction-status";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

/** Stable placeholder so the countdown hook is not re-armed on every render. */
const FAR_FUTURE = "2999-01-01T00:00:00.000Z";
const PAST = "1970-01-01T00:00:00.000Z";
export const Route = createFileRoute("/card/$id")({
  loader: async ({ params }) => ({ seo: await fetchSeoCard(params.id) }),
  head: ({ loaderData, params }) => {
    const url = `${SITE_URL}/card/${params.id}`;
    const seo = loaderData?.seo ?? null;
    if (!seo) {
      return {
        meta: [{ title: "รายละเอียดการ์ด — Taletails" }, { name: "robots", content: "noindex" }],
      };
    }
    const grade = gradeLabel(seo);
    const title = [seo.name, seo.setName && seo.setName !== "-" ? seo.setName : "", grade]
      .filter(Boolean)
      .join(" ");
    const fullTitle = `ประมูล ${title} | Taletails`;
    const description = clip(
      `ร่วมประมูล ${title} บน Taletails ดูราคาปัจจุบันแบบเรียลไทม์ ตรวจสอบเกรดและใบรับรอง จ่ายผ่าน PromptPay และมีเลขพัสดุติดตาม`,
    );
    const image = absoluteImage(seo.image);
    return {
      meta: [
        { title: fullTitle },
        { name: "description", content: description },
        { property: "og:title", content: fullTitle },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(
            breadcrumbJsonLd([
              { name: "หน้าแรก", path: "/" },
              { name: "ประมูล", path: "/auctions" },
              { name: title, path: `/card/${params.id}` },
            ]),
          ),
        },
      ],
    };
  },
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
  // ตั้งเวลาเริ่มไว้ล่วงหน้า (start_time อนาคต) = "กำลังจะเปิดประมูล": ยังบิดไม่ได้ แสดงนับถอยหลังแทน
  // ครบเวลา useCountdown จะ isFinished → หน้ากลายเป็นห้องประมูลเองโดยไม่ต้องรีเฟรช
  const startCountdown = useCountdown(auction?.start_time ?? PAST);
  const upcoming =
    !!auction && auction.status === "active" && !!startCountdown && !startCountdown.isFinished;

  // สถานะของผู้เสนอราคา: bids เรียงใหม่สุดก่อน → แถวแรกคือผู้เสนอสูงสุด
  const bidRows = bidsQuery.data ?? [];
  const isLeading = !!userId && bidRows[0]?.user_id === userId;
  const isOutbid = !!userId && !isLeading && bidRows.some((b) => b.user_id === userId);
  const myStatus: "lead" | "out" | null =
    isAuction && !!auction && !closed && !upcoming
      ? isLeading
        ? "lead"
        : isOutbid
          ? "out"
          : null
      : null;

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
  // มือถือ: ถ้าตอนนี้นำอยู่ แถบล่างแสดงข้อความ "คุณนำอยู่" ก่อน กด "เสนอเพิ่ม" ค่อยโชว์ตัวปรับราคา
  const [raising, setRaising] = useState(false);
  useEffect(() => {
    if (!isLeading) setRaising(false);
  }, [isLeading]);
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

  // หน้านี้คือหน้าประมูล — การ์ดขายราคาตายตัวมีหน้าของตัวเองที่ /product (มีตะกร้า ถูกใจ ราคากลาง)
  // ลิงก์เก่า/ปุ่มในหลังร้าน/ลิงก์ที่แชร์มาจึงถูกส่งต่อไปที่นั่น ลูกค้าจะได้เห็นหน้าเดียวกันเสมอ
  const isFixedPrice = card?.sale_type === "fixed_price";
  useEffect(() => {
    if (!isFixedPrice) return;
    void navigate({ to: "/product/$id", params: { id }, replace: true });
  }, [isFixedPrice, id, navigate]);

  if (cardQuery.isLoading || pendingOrderId || isFixedPrice) {
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
        <p className="mt-2 text-sm text-muted-foreground">การ์ดอาจถูกลบหรือปิดการขายไปแล้ว</p>
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
        onSuccess: () => {
          toast.success(`เสนอราคา ${thb.format(amount)} สำเร็จ`);
          setRaising(false);
        },
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

      <main className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <BackButton className="mb-3 sm:mb-4" />

        <div className="grid gap-5 sm:gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          {/* Gallery */}
          <CardGallery
            images={images}
            alt={`${card.name} ${card.grade ?? ""}`}
            // ผู้ที่ยังไม่ล็อกอินอ่านได้เฉพาะรอบที่ status = active (RLS) — อ่านรอบไม่ได้ = รอบปิดไปแล้ว
            // ห้ามขึ้นป้าย "กำลังประมูล" ในกรณีนั้น
            liveAuction={isAuction && Boolean(auction) && !closed && !upcoming}
            status={card.status}
            peek
          />

          {/* Detail */}
          <section className="lg:pt-2">
            <p className="text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
              {card.set_name ?? "TALETAILS COLLECTION"}
            </p>
            <h1 className="mt-2 font-display text-2xl leading-tight font-semibold sm:mt-3 sm:text-4xl">
              {card.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:mt-4">
              {card.grade && (
                <span className="rounded-full bg-foreground px-3 py-1 font-semibold text-background">
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
            <div
              className={cn(
                "mt-4 rounded-[24px] border bg-card p-4 shadow-[0_18px_50px_-38px_hsl(var(--foreground)/0.5)] sm:mt-5 sm:p-6",
                myStatus === "lead"
                  ? "border-emerald-600/40 ring-4 ring-emerald-600/10"
                  : myStatus === "out"
                    ? "border-destructive/40 ring-4 ring-destructive/10"
                    : "border-border/70",
              )}
            >
              {myStatus && (
                <div
                  role="status"
                  className={cn(
                    "mb-4 flex items-start gap-2.5 rounded-2xl px-3.5 py-3 text-xs",
                    myStatus === "lead"
                      ? "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                      : "bg-destructive/10 text-destructive",
                  )}
                >
                  {myStatus === "lead" ? (
                    <CircleCheck className="mt-0.5 h-5 w-5 shrink-0" />
                  ) : (
                    <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
                  )}
                  <div>
                    <p className="font-display text-sm font-semibold">
                      {myStatus === "lead" ? "คุณนำอยู่" : "ถูกแซงแล้ว"}
                    </p>
                    <p className="mt-0.5 leading-snug">
                      {myStatus === "lead"
                        ? "ราคาของคุณสูงสุดอยู่ตอนนี้"
                        : `มีคนเสนอสูงกว่าคุณ เสนอ ${thb.format(minNext)} ขึ้นไปเพื่อกลับมานำ`}
                    </p>
                  </div>
                </div>
              )}
              <p className="text-[12px] tracking-wide text-muted-foreground">
                {upcoming ? "ราคาเริ่มต้น" : isAuction ? "ราคาประมูลปัจจุบัน" : "ราคาขาย"}
              </p>
              <p className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                {thb.format(price)}
              </p>

              {isAuction && auction && upcoming && (
                <div className="mt-5 space-y-4 border-t border-dashed border-border pt-5">
                  <UpcomingCountdown startTime={auction.start_time} />
                  <p className="text-xs text-muted-foreground">
                    บิดขั้นละ {thb.format(Number(auction.bid_increment))} ·
                    ช่องเสนอราคาจะเปิดเมื่อถึงเวลา
                  </p>
                  <NotifyWhenOpenButton />
                </div>
              )}

              {isAuction && auction && !upcoming && (
                <>
                  <div className="mt-3 border-t border-dashed border-border pt-3 sm:mt-5 sm:pt-5">
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

                  {/* จอคอม: ช่องเสนอราคาอยู่ใต้ตัวนับเวลาทันที (เดิมอยู่ใต้สถิติ ตกขอบล่างจอโน้ตบุ๊ก) · มือถือใช้แถบล่าง */}
                  {!closed ? (
                    <div
                      id="bid-form"
                      className="mt-5 flex scroll-mt-28 flex-wrap items-center gap-2 max-lg:hidden"
                    >
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
                    <div className="mt-5 space-y-3">
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
                  <div className="mt-4 grid grid-cols-2 gap-4 text-xs sm:mt-5">
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
                        disabled={
                          buyNow.isPending || card.status !== "available" || !card.is_published
                        }
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
              <h2 className="mb-2 font-display text-sm tracking-[0.16em] uppercase">ข้อมูลการ์ด</h2>
              {[
                { label: "ชุด", value: card.set_name },
                { label: "หมายเลขการ์ด", value: card.card_no },
                { label: "ภาษา", value: card.language },
                { label: "ปี", value: card.year ? String(card.year) : null },
                { label: "สภาพ", value: card.condition },
                { label: "สถาบันเกรด", value: card.grading_company },
                { label: "เลขใบรับรอง", value: card.certification_no },
              ]
                // แถวที่ว่างทำให้หน้าดูเหมือนยังกรอกไม่เสร็จ → ซ่อนไปเลย
                .filter((row): row is { label: string; value: string } =>
                  Boolean(row.value?.trim()),
                )
                .map((row) => (
                  <Spec key={row.label} label={row.label} value={row.value} />
                ))}
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
                  {bidRows.length === 0 && (
                    <p className="px-4 py-5 text-center text-xs text-muted-foreground">
                      ยังไม่มีการเสนอราคา
                    </p>
                  )}
                  {bidRows.map((b, i) => (
                    <div
                      key={b.id}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3",
                        !!userId && b.user_id === userId && "bg-primary/5",
                      )}
                    >
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
                          {!!userId && b.user_id === userId && (
                            <span className="ml-1.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                              คุณ
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
      {/* แถบลอยแบบแคปซูล ห่างขอบซ้าย/ขวา/ล่าง เหมือนเมนูล่าง — iPhone มุมจอโค้งและมีขีด Home ถ้าชิดขอบปุ่มจะโดนกินและกดยาก */}
      {((isAuction && auction && !closed) ||
        (!isAuction && card.status === "available" && card.is_published)) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden">
          <div className="pointer-events-auto mx-auto max-w-xl rounded-[1.75rem] border border-border/70 bg-card/95 px-3.5 pt-2.5 pb-2.5 shadow-[0_18px_40px_-16px_oklch(0.35_0.06_45/0.45)] backdrop-blur-xl">
            {isAuction && auction && !upcoming ? (
              <div className="mx-auto max-w-xl">
                {isLeading && !raising ? (
                  <div className="flex items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-base leading-tight font-semibold text-emerald-700 tabular-nums dark:text-emerald-400">
                        คุณนำอยู่ {thb.format(price)}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        ขั้นต่ำถัดไป {thb.format(minNext)}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      className="min-h-12 rounded-xl border-primary px-5 font-semibold text-primary"
                      onClick={() => setRaising(true)}
                    >
                      <Gavel className="h-4 w-4" /> เสนอเพิ่ม
                    </Button>
                  </div>
                ) : (
                  <>
                    <p className="mb-1.5 px-0.5 text-[11px] text-muted-foreground">
                      ขั้นละ{" "}
                      <b className="text-foreground">{thb.format(Number(auction.bid_increment))}</b>{" "}
                      · ต่ำสุด <b className="text-foreground">{thb.format(minNext)}</b>
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex h-12 shrink-0 items-center rounded-2xl border border-border bg-card">
                        <button
                          type="button"
                          aria-label="ลดราคาที่เสนอ"
                          disabled={amount <= minNext}
                          onClick={() =>
                            setAmount((a) => Math.max(minNext, a - Number(auction.bid_increment)))
                          }
                          className="grid h-full w-11 place-items-center rounded-l-2xl text-foreground disabled:opacity-30"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          inputMode="numeric"
                          aria-label="จำนวนเงินที่ต้องการเสนอ"
                          value={amount}
                          min={minNext}
                          step={Number(auction.bid_increment)}
                          onChange={(e) => setAmount(Number(e.target.value))}
                          className="h-full w-[4.5rem] min-w-0 [appearance:textfield] bg-transparent text-center font-display text-base font-bold tabular-nums outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                        />
                        <button
                          type="button"
                          aria-label="เพิ่มราคาที่เสนอ"
                          onClick={() => setAmount((a) => a + Number(auction.bid_increment))}
                          className="grid h-full w-11 place-items-center rounded-r-2xl text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <ConfirmDialog
                        title="ยืนยันการเสนอราคา"
                        description={`คุณกำลังเสนอราคา ${thb.format(amount)} สำหรับการ์ดนี้ การเสนอราคาไม่สามารถยกเลิกได้`}
                        confirmLabel="เสนอราคา"
                        disabled={placeBid.isPending}
                        onConfirm={submitBid}
                        trigger={
                          <Button
                            className="min-h-12 min-w-0 flex-1 rounded-xl font-semibold hover:bg-primary hover:brightness-95 active:brightness-90"
                            disabled={placeBid.isPending}
                          >
                            {placeBid.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Gavel className="h-4 w-4" />
                            )}
                            <span className="truncate">เสนอ {thb.format(amount)}</span>
                          </Button>
                        }
                      />
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="mx-auto flex max-w-xl items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-muted-foreground">
                    {upcoming ? "เปิดประมูลใน" : "ราคาขาย"}
                  </p>
                  <p className="truncate font-display text-xl leading-tight font-bold tabular-nums">
                    {upcoming ? formatCountdownTh(startCountdown) : thb.format(price)}
                  </p>
                </div>
                {upcoming ? (
                  <NotifyWhenOpenButton compact />
                ) : (
                  <ConfirmDialog
                    title="ยืนยันการซื้อการ์ด"
                    description={`ยืนยันซื้อ "${card.name}" ราคา ${thb.format(Number(card.price ?? 0))} ระบบจะจองสินค้าไว้ให้คุณและพาไปหน้าชำระเงิน`}
                    confirmLabel="ซื้อเลย"
                    disabled={buyNow.isPending}
                    onConfirm={submitBuyNow}
                    trigger={
                      <Button
                        className="min-h-12 flex-1 rounded-xl font-semibold hover:bg-primary hover:brightness-95 active:brightness-90"
                        disabled={buyNow.isPending}
                      >
                        {buyNow.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <ShoppingBag className="h-4 w-4" />
                        )}
                        ซื้อเลย
                      </Button>
                    }
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
