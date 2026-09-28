import { Link } from "@tanstack/react-router";
import { ArrowRight, History } from "lucide-react";

import { AuctionCard, auctionKind } from "@/components/card/AuctionCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useLiveAuctions } from "@/hooks/useLiveAuctions";

const MAX_ITEMS = 8;

/**
 * หน้าแรก "ประมูลสด" — แถวการ์ด (เดิมเป็นสไลด์ใบใหญ่ 1 รายการต่อจอ)
 * จอใหญ่เป็นตาราง 5 คอลัมน์ · มือถือเลื่อนแนวนอนเห็น ~1.6 ใบให้รู้ว่ามีต่อ
 * เรียง: กำลังประมูล (ใกล้ปิดก่อน) → เร็ว ๆ นี้ (เปิดก่อน) · ช่องที่เหลือเป็นลิงก์ผลประมูลที่ผ่านมา
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

  const summary =
    running.length > 0
      ? `เปิดอยู่ ${running.length} รายการ${upcoming.length ? ` · เร็ว ๆ นี้ ${upcoming.length}` : ""}`
      : upcoming.length > 0
        ? `เร็ว ๆ นี้ ${upcoming.length} รายการ`
        : "ยังไม่มีรอบที่เปิดอยู่";

  return (
    <section id="auctions" className="mx-auto max-w-7xl px-4 pt-10 pb-12 sm:px-6 lg:px-8">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
          <h2 className="font-display text-2xl font-bold sm:text-[26px]">ประมูลสด</h2>
          <p className="text-sm text-muted-foreground">{live.isLoading ? " " : summary}</p>
        </div>
        <Link
          to="/auctions"
          className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          ดูทั้งหมด <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {live.isLoading ? (
        <div className="-mx-4 mt-4 flex gap-3 overflow-hidden px-4 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="aspect-[5/7] w-[205px] shrink-0 rounded-[18px] sm:w-auto"
            />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-10 text-center">
          <p className="font-semibold">รอเปิดรอบประมูลใหม่</p>
          <p className="text-sm text-muted-foreground">เปิดรับแจ้งเตือนไว้ จะได้ไม่พลาดรอบถัดไป</p>
          <Link
            to="/auctions"
            search={{ status: "past" }}
            className="mt-1 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-primary"
          >
            <History className="h-4 w-4" /> ดูผลประมูลที่ผ่านมา
          </Link>
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 mt-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-1 pb-3 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {items.map((a) => (
            <AuctionCard
              key={a.id}
              auction={a}
              className="w-[205px] shrink-0 snap-start sm:w-auto"
            />
          ))}
          {/* มีน้อยกว่าที่แถวรับได้ → ช่องที่เหลือเป็นลิงก์ผลประมูล ไม่ยืดการ์ดให้ใหญ่ */}
          {items.length < 5 && (
            <Link
              to="/auctions"
              search={{ status: "past" }}
              className="flex w-[205px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-border p-4 text-center text-sm text-muted-foreground transition-colors hover:bg-secondary/50 sm:w-auto"
            >
              <History className="h-6 w-6" />
              <span className="font-semibold text-foreground">ดูผลประมูลที่ผ่านมา</span>
              <span className="text-xs">ราคาที่ปิดจริงของแต่ละรอบ</span>
            </Link>
          )}
        </div>
      )}
    </section>
  );
}
