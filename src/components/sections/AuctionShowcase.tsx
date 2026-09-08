import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Coins,
  Heart,
  Gavel,
  History,
  Lock,
  Radio,
  Timer,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { Auction } from "@/data/auctions";
import type { AuctionOutcomeInfo } from "@/lib/auction-status";
import { timeAgo, useBidHistory } from "@/hooks/useBidHistory";
import {
  useAuctionRealtime,
  useAuthUserId,
  useBids,
  usePlaceBid,
} from "@/hooks/useCardDetail";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { SmartImage } from "@/components/ui/smart-image";
import { ZoomableImage } from "@/components/ui/image-zoom";

export function AuctionShowcase({
  auction,
  auctionId,
  bidIncrement = 50,
  outcome,
}: {
  auction: Auction;
  /** รหัสรอบประมูลจริงใน Supabase — ถ้ามี จะเคาะราคาลงฐานข้อมูลจริง */
  auctionId?: string | undefined;
  bidIncrement?: number | undefined;
  /** สถานะผลการประมูล — เมื่อไม่ใช่ "live" จะล็อกไม่ให้เสนอราคา */
  outcome?: AuctionOutcomeInfo;
}) {
  const closed = outcome ? outcome.outcome !== "live" : false;
  const c = useCountdown(auction.endTime);
  const [shot, setShot] = useState(0);
  const [bid, setBid] = useState(auction.currentBid + bidIncrement);
  const demo = useBidHistory(auction.id, auction.currentBid, auction.bidCount);
  const userId = useAuthUserId();
  useAuctionRealtime(auctionId);
  const liveBids = useBids(auctionId);
  const placeBid = usePlaceBid(auctionId);
  const [, setTick] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const watchlist = useWatchlist();
  const watched = watchlist.has(auction.id);

  const toggleWatch = () => {
    const added = watchlist.toggle({
      id: auction.id,
      name: auction.cardName,
      subtitle: auction.setName,
      imageUrl: auction.imageUrl,
      price: auction.currentBid,
      kind: "auction",
    });
    toast[added ? "success" : "info"](
      added ? "เพิ่มลงรายการที่อยากได้แล้ว" : "นำออกจากรายการที่อยากได้แล้ว",
      { description: auction.cardName },
    );
  };

  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, []);

  const requireAuth = useRequireAuth();
  const gallery = auction.images?.length ? auction.images : [auction.imageUrl];
  const minNext = auction.currentBid + (auction.bidCount === 0 ? 0 : bidIncrement);
  const urgent = !!c && !c.isFinished && c.totalMs < 3 * 60 * 60 * 1000;

  const entries = auctionId
    ? (liveBids.data ?? []).map((b) => ({
        id: b.id,
        bidder:
          b.user_id === userId ? "คุณ" : (b.users?.username ?? "ผู้ประมูล") + "***",
        amount: Number(b.amount),
        at: new Date(b.created_at).getTime(),
      }))
    : demo.entries;

  // ราคาปัจจุบันตามฐานข้อมูลเมื่อเชื่อมต่อรอบประมูลจริง
  useEffect(() => {
    setBid((b) => (b < auction.currentBid + bidIncrement ? auction.currentBid + bidIncrement : b));
  }, [auction.currentBid, bidIncrement]);

  const time = c
    ? [
        { v: pad(c.days * 24 + c.hours), l: "ชม." },
        { v: pad(c.minutes), l: "นาที" },
        { v: pad(c.seconds), l: "วินาที" },
      ]
    : [
        { v: "--", l: "ชม." },
        { v: "--", l: "นาที" },
        { v: "--", l: "วินาที" },
      ];

  const canBid = () => {
    if (!requireAuth("กรุณาเข้าสู่ระบบก่อนเสนอราคา")) return false;
    if (bid < minNext) {
      toast.error(`ต้องเสนออย่างน้อย ${thb.format(minNext)}`);
      return false;
    }
    return true;
  };

  const submit = () => {
    if (!canBid()) return;

    if (!auctionId || !userId) {
      demo.pushOwnBid(bid);
      toast.success(`เสนอราคา ${thb.format(bid)} เรียบร้อย`);
      return;
    }

    placeBid.mutate(
      { amount: bid, userId },
      {
        onSuccess: () => toast.success(`เสนอราคา ${thb.format(bid)} เรียบร้อย`),
        onError: (e: Error) => toast.error("เสนอราคาไม่สำเร็จ", { description: e.message }),
      },
    );
  };

  return (
    <>
      <section className="bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div
            key={auction.id}
            className="grid animate-fade-in items-stretch gap-4 sm:gap-5 lg:grid-cols-[1.15fr_1fr]"
          >
            {/* Card viewer */}
            <div className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-border bg-card">
              <div className="relative flex aspect-[3/4] w-full min-h-[320px] items-center justify-center bg-transparent p-4 lg:aspect-auto lg:min-h-0 lg:flex-1 lg:p-6">
                {gallery.map((src, i) => (
                  <ZoomableImage
                    key={src + i}
                    src={src}
                    alt={i === shot ? `${auction.cardName} เกรด ${auction.grade} รูปที่ ${i + 1}` : ""}
                    transformWidth={800}
                    priority={i === 0}
                    galleryImages={gallery}
                    galleryIndex={i}
                    onGalleryIndexChange={setShot}

                    wrapperClassName={`absolute inset-0 p-4 transition-opacity duration-500 lg:p-6 ${
                      i === shot ? "opacity-100" : "opacity-0 pointer-events-none"
                    }`}
                    className="object-contain drop-shadow-2xl rounded-xl"
                  />
                ))}

                <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-ember px-2.5 py-1 text-[11px] font-bold text-primary-foreground shadow-glow sm:top-4 sm:left-4 sm:px-3 sm:py-1.5 sm:text-xs">
                  <Radio className="h-3.5 w-3.5" />
                  กำลังประมูล
                </span>
                <span className="absolute top-3 right-3 rounded-full border border-accent/50 bg-background/70 px-2.5 py-1 font-display text-[11px] font-bold text-accent sm:top-4 sm:right-4 sm:px-3 sm:py-1.5 sm:text-xs">
                  {auction.grade}
                </span>

                <button
                  onClick={() => setShot((s) => (s - 1 + gallery.length) % gallery.length)}
                  aria-label="รูปก่อนหน้า"
                  className="absolute top-1/2 left-3 flex min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition-colors hover:bg-secondary sm:left-4"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  onClick={() => setShot((s) => (s + 1) % gallery.length)}
                  aria-label="รูปถัดไป"
                  className="absolute top-1/2 right-3 flex min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition-colors hover:bg-secondary sm:right-4"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>

                {/* Thumbnails overlay — bottom inner */}
                <div className="no-scrollbar absolute right-0 bottom-3 left-0 flex justify-start gap-2 overflow-x-auto px-3 sm:bottom-4 sm:justify-center sm:px-4">
                  {gallery.map((src, i) => (
                    <button
                      key={src + i}
                      type="button"
                      onClick={() => setShot(i)}
                      aria-label={`ดูรูปที่ ${i + 1}`}
                      aria-pressed={i === shot}
                      className={`min-h-10 w-10 shrink-0 overflow-hidden rounded-lg transition-all duration-300 ${
                        i === shot
                          ? "opacity-100 ring-2 ring-white"
                          : "opacity-50 hover:opacity-80"
                      }`}
                    >
                      <SmartImage
                        src={src}
                        alt=""
                        transformWidth={96}
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Product details */}
              <div className="border-t border-border p-3 sm:p-4">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:text-sm">
                  <div>
                    <dt className="text-muted-foreground">ชื่อการ์ด</dt>
                    <dd className="font-semibold">{auction.cardName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">ชุด (Set)</dt>
                    <dd className="font-semibold">{auction.setName}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">เกรด</dt>
                    <dd className="font-semibold text-accent">{auction.grade}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">จำนวนครั้งที่เสนอ</dt>
                    <dd className="font-semibold tabular-nums">{auction.bidCount} ครั้ง</dd>
                  </div>

                  {expanded && (
                    <>
                      <div>
                        <dt className="text-muted-foreground">Card No.</dt>
                        <dd className="font-semibold tabular-nums">{auction.cardNo}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">ภาษา</dt>
                        <dd className="font-semibold">{auction.language}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Rarity</dt>
                        <dd className="font-semibold">{auction.rarity}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">ปี</dt>
                        <dd className="font-semibold tabular-nums">{auction.year}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Grading Company</dt>
                        <dd className="font-semibold">{auction.gradingCompany}</dd>
                      </div>
                      <div>
                        <dt className="text-muted-foreground">Certification No.</dt>
                        <dd className="font-semibold tabular-nums">{auction.certificationNo}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">สภาพ / ตำหนิ</dt>
                        <dd className="font-medium leading-relaxed">{auction.conditionNote}</dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-muted-foreground">รายละเอียดจากผู้ขาย</dt>
                        <dd className="font-medium leading-relaxed">{auction.sellerNote}</dd>
                      </div>
                    </>
                  )}
                </dl>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    className="min-h-10 flex-1 rounded-xl text-xs font-semibold sm:text-sm"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                  >
                    {expanded ? (
                      <>
                        ซ่อนรายละเอียด <ChevronUp className="h-4 w-4" />
                      </>
                    ) : (
                      <>
                        ดูเพิ่มเติม <ChevronDown className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    variant={watched ? "default" : "outline"}
                    className={`min-h-10 flex-1 rounded-xl text-xs font-semibold sm:text-sm ${
                      watched ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""
                    }`}
                    onClick={toggleWatch}
                    aria-pressed={watched}
                  >
                    <Heart className={`h-4 w-4 ${watched ? "fill-current" : ""}`} />
                    {watched ? "อยู่ในรายการที่อยากได้" : "เพิ่มลงรายการที่อยากได้"}
                  </Button>
                </div>
              </div>

            </div>


            {/* Dashboard */}
            <div className="space-y-3 sm:space-y-4">
              <div>
                <h2 className="font-display text-xl font-bold sm:text-3xl">{auction.cardName}</h2>
                <p className="text-xs text-muted-foreground sm:text-sm">{auction.setName}</p>
              </div>

              <div className="rounded-2xl bg-gradient-ember p-3 text-primary-foreground shadow-glow sm:rounded-3xl sm:p-5">
                <p className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
                  <Timer className="h-4 w-4" />
                  เหลือเวลา
                </p>
                <div className="mt-1 flex items-end gap-2 tabular-nums sm:mt-2 sm:gap-3">
                  {time.map((p, i) => (
                    <div key={p.l} className="flex items-end gap-2 sm:gap-3">
                      {i > 0 && (
                        <span className="pb-1.5 font-display text-xl font-bold opacity-70 sm:pb-2 sm:text-3xl">
                          :
                        </span>
                      )}
                      <div className="text-center">
                        <div className="font-display text-2xl leading-none font-extrabold sm:text-5xl">
                          {p.v}
                        </div>
                        <div className="mt-0.5 text-[10px] opacity-90 sm:mt-1 sm:text-[11px]">
                          {p.l}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {urgent && (
                <p className="flex items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-medium text-primary sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-sm">
                  <Bell className="h-4 w-4" />
                  ใกล้ปิดประมูล ระบบจะแจ้งเตือนให้คุณ
                </p>
              )}

              <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-3 sm:rounded-3xl sm:p-5">
                <p className="flex items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                  <Coins className="h-4 w-4 text-primary" />
                  ราคาปัจจุบัน
                </p>
                <p className="mt-0.5 font-display text-3xl font-extrabold text-primary sm:mt-1 sm:text-5xl">
                  {thb.format(auction.currentBid)}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2 sm:mt-4">
                  <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-primary/40 px-3 text-xs font-semibold text-primary sm:min-h-10 sm:px-4 sm:text-sm">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/20">
                      <Gavel className="h-3 w-3" />
                    </span>
                    {auction.bidCount} ครั้งที่เสนอ
                  </span>
                </div>

                <div className="mt-3 border-t border-dashed border-border pt-2.5 sm:mt-5 sm:pt-4">
                  <p className="text-xs text-muted-foreground sm:text-sm">
                    เสนอราคาขั้นต่ำครั้งถัดไป
                  </p>
                  <p className="font-display text-xl font-bold sm:text-2xl">
                    {thb.format(minNext)}
                  </p>
                </div>

                <img
                  src={taletailsLogo}
                  alt=""
                  width={96}
                  height={96}
                  className="pointer-events-none absolute -right-3 -bottom-3 h-16 w-16 animate-bounce rounded-full object-cover opacity-90 [animation-duration:3.5s] sm:h-24 sm:w-24"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bidding bar — follows the site theme (light/dark) */}
      <div className="border-y border-border bg-background text-foreground">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Input
                type="number"
                aria-label="จำนวนเงินที่ต้องการเสนอ"
                value={bid}
                min={minNext}
                step={50}
                onChange={(e) => setBid(Number(e.target.value))}
                className="min-h-11 min-w-0 flex-1 rounded-xl border-2 border-border bg-white text-base font-semibold text-neutral-900 shadow-sm placeholder:text-neutral-400 focus-visible:border-primary"
              />
              <Button
                variant="secondary"
                className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold transition-colors"
                onClick={() => setBid((b: number) => b + 1000)}
              >
                +฿1,000
              </Button>
              <Button
                variant="secondary"
                className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold transition-colors"
                onClick={() => setBid((b: number) => b + 5000)}
              >
                +฿5,000
              </Button>
            </div>
            <ConfirmDialog
              title="ยืนยันการเสนอราคา"
              description={
                <>
                  คุณกำลังเสนอราคา{" "}
                  <span className="font-display font-bold text-primary">{thb.format(bid)}</span> สำหรับ{" "}
                  {auction.cardName}
                  <br />
                  เมื่อยืนยันแล้วจะยกเลิกการเสนอราคาไม่ได้
                </>
              }
              confirmLabel="ยืนยันเสนอราคา"
              disabled={placeBid.isPending}
              onConfirm={submit}
              trigger={
                <Button
                  className="min-h-11 w-full rounded-xl bg-gradient-ember px-6 font-semibold text-primary-foreground shadow-glow transition-opacity hover:opacity-90 sm:w-auto"
                  disabled={placeBid.isPending}
                >
                  <Gavel className="h-4 w-4" />
                  {placeBid.isPending ? "กำลังส่งราคา..." : "ยืนยันเสนอราคา"}
                </Button>
              }
            />
          </div>

          {/* Realtime bid history */}
          <div className="mt-3 rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4 text-primary" />
                ประวัติการประมูลแบบเรียลไทม์
              </p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
                สด
              </span>
            </div>
            <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
              {entries.map((e, i) => (
                <li
                  key={e.id}
                  className={`flex animate-fade-in items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    i === 0 ? "bg-primary/10 font-semibold" : "bg-muted/50"
                  }`}
                >
                  <span className="truncate">{e.bidder}</span>
                  <span className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-muted-foreground">{timeAgo(e.at)}</span>
                    <span className="font-display font-bold text-primary">
                      {thb.format(e.amount)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}
