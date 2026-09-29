import { Link } from "@tanstack/react-router";
import { ArrowRight, History } from "lucide-react";

import { AuctionCard, auctionKind } from "@/components/card/AuctionCard";
import { NotifyWhenOpenButton } from "@/components/site/UpcomingCountdown";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCountdownTh, useCountdown } from "@/hooks/useCountdown";
import { useLiveAuctions, type LiveAuction } from "@/hooks/useLiveAuctions";

const MAX_ITEMS = 8;
/** แถวการ์ดเต็มที่ 5 ใบ (จอใหญ่) — น้อยกว่านี้ให้แผง "รอบถัดไป" เติมที่ว่าง */
const FULL_ROW = 5;
/** มือถือแสดงกี่ใบ (ที่เหลือดูที่ปุ่ม "ดูทั้งหมด") */
const MOBILE_MAX = 3;

const openFmt = new Intl.DateTimeFormat("th-TH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * หน้าแรก "ประมูลสด" — แถวการ์ด (mockup แบบ A, 29 ก.ย. 2026)
 * จอใหญ่เป็นตาราง 5 คอลัมน์ · มือถือเลื่อนแนวนอนเห็น ~1.5 ใบให้รู้ว่ามีต่อ
 * เรียง: กำลังประมูล (ใกล้ปิดก่อน) → รอเปิด (เปิดก่อน) · มีน้อยกว่า 5 ใบ แผง "รอบถัดไป" เติมที่ว่างข้าง ๆ
 */
export function LiveAuctionSlider() {
  const live = useLiveAuctions();
  const now = Date.now();
  const all = live.data ?? [];
  const running = all
    .filter((a) => auctionKind(a, now) === "live")
    .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
  const upcoming = all
    .filter((a) => auctionKind(a, now) === "upcoming")
    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
  const items = [...running, ...upcoming].slice(0, MAX_ITEMS);
  const nextUp = upcoming[0];

  return (
    <section id="auctions" className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between gap-3">
        {/* ตัวเลข "เปิดอยู่ N รอบ" มีในกล่องทางลัดด้านบนแล้ว จึงไม่ซ้ำที่หัวข้อ */}
        <h2 className="font-display text-2xl font-bold sm:text-[26px]">ประมูลสด</h2>
        <div className="flex shrink-0 items-center gap-4">
          <Link
            to="/auctions"
            search={{ status: "past" }}
            className="hidden min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground sm:inline-flex"
          >
            <History className="h-4 w-4" /> ผลที่ผ่านมา
          </Link>
          <Link
            to="/auctions"
            className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            ดูทั้งหมด <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {live.isLoading ? (
        <div className="-mx-4 mt-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-[420px] w-[220px] shrink-0 rounded-[20px] sm:w-auto" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
          <p className="font-semibold">ยังไม่มีรอบประมูลตอนนี้</p>
          <div className="w-full max-w-xs">
            <NotifyWhenOpenButton hint />
          </div>
          <Link
            to="/auctions"
            search={{ status: "past" }}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <History className="h-4 w-4" /> ดูผลประมูลที่ผ่านมา
          </Link>
        </div>
      ) : (
        <div className="sm:no-scrollbar mt-4 grid gap-3 sm:flex sm:snap-x sm:snap-mandatory sm:gap-4 sm:overflow-x-auto sm:pt-1 sm:pb-3 lg:grid lg:grid-cols-5 lg:overflow-visible">
          {/* มือถือ: การ์ดแนวนอนเรียงลงมา แสดง 3 ใบแรก · จอ sm ขึ้นไป: การ์ดตั้ง */}
          {items.map((a, i) => (
            <AuctionCard
              key={a.id}
              auction={a}
              rowOnMobile
              className={`w-full sm:w-[236px] sm:shrink-0 sm:snap-start lg:w-auto ${i >= MOBILE_MAX ? "max-sm:hidden" : ""}`}
            />
          ))}
          {/* มีน้อยกว่า 5 ใบ (เฉพาะจอใหญ่) → แผงรอบถัดไปกินที่ที่เหลือ ไม่ปล่อยเป็นช่องว่าง */}
          {items.length < FULL_ROW && (
            <NextRoundPanel
              nextUp={nextUp}
              span={FULL_ROW - items.length}
              className="hidden lg:flex"
            />
          )}
        </div>
      )}
      {items.length > MOBILE_MAX && (
        <Link
          to="/auctions"
          className="mt-3 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm font-semibold sm:hidden"
        >
          ดูประมูลทั้งหมด {items.length} รายการ <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  );
}

const SPAN_CLASS: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
};

function NextRoundPanel({
  nextUp,
  span,
  className,
}: {
  nextUp: LiveAuction | undefined;
  span: number;
  className?: string | undefined;
}) {
  const countdown = useCountdown(nextUp?.startTime ?? "1970-01-01T00:00:00.000Z");
  const showNext = !!nextUp && !!countdown && !countdown.isFinished;
  return (
    <div
      className={`${SPAN_CLASS[span] ?? ""} flex-col justify-center gap-3 rounded-[20px] border-[1.5px] border-dashed border-border px-6 py-6 xl:px-8 ${className ?? ""}`}
    >
      <h3 className="font-display text-lg font-semibold">
        {showNext ? `รอบถัดไปเปิดใน ${formatCountdownTh(countdown)}` : "ยังไม่มีรอบถัดไป"}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {showNext
          ? `${nextUp.cardName} เปิดประมูล ${openFmt.format(new Date(nextUp.startTime))} น.`
          : "เมื่อร้านตั้งเวลาเปิดรอบใหม่ จะขึ้นที่นี่"}
      </p>
      <div className="flex max-w-sm flex-col gap-2">
        <NotifyWhenOpenButton hint />
        <Link
          to="/auctions"
          search={{ status: "past" }}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-secondary px-4 text-sm font-semibold hover:bg-secondary/70"
        >
          ดูผลประมูลที่ผ่านมา
        </Link>
      </div>
    </div>
  );
}
