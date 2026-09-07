import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Gavel, Radio } from "lucide-react";
import { useState } from "react";

import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { getLiveAuctions, type Auction } from "@/data/auctions";
import { useLiveAuctions } from "@/hooks/useLiveAuctions";
import { thb } from "@/lib/cart";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";
import { SmartImage } from "@/components/ui/smart-image";


function BigCountdown({ endTime }: { endTime: string }) {
  const c = useCountdown(endTime);
  const parts = c
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

  return (
    <div className="rounded-2xl bg-gradient-ember p-3 text-primary-foreground shadow-glow">
      <p className="text-[11px] font-semibold tracking-wide opacity-90">⏱ เหลือเวลา</p>
      <div className="mt-1 flex flex-wrap items-end gap-x-2 gap-y-1 tabular-nums">
        {parts.map((p, i) => (
          <div key={p.l} className="flex items-end gap-2">
            {i > 0 && <span className="pb-1.5 font-display text-xl font-bold opacity-70">:</span>}
            <div className="text-center">
              <div className="font-display text-2xl leading-none font-extrabold sm:text-3xl">
                {p.v}
              </div>
              <div className="mt-0.5 text-[10px] opacity-85">{p.l}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function LiveAuctionSlider() {
  const [index, setIndex] = useState(0);
  const live = useLiveAuctions();
  const liveOnly = (live.data ?? []).filter((a) => a.outcome.outcome === "live");
  const items: Auction[] = liveOnly.length ? liveOnly : getLiveAuctions();
  const go = (d: number) => setIndex((i) => (i + d + items.length) % items.length);
  const active = items[Math.min(index, items.length - 1)]!;

  return (
    <section id="auctions" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
      <SectionHeading
        eyebrow={
          <>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
            กำลังประมูล
          </>
        }
        title="ประมูลสด"
        description="เลื่อนดูการ์ดที่กำลังเปิดประมูล เคาะราคาได้ทันทีแบบเรียลไทม์"
        actionLabel="ดูการประมูลทั้งหมด"
        actionTo="/auctions"
      />

      <div className="relative">
        <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-border bg-card shadow-card">
          <div className="grid w-full min-w-0 gap-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="relative aspect-[4/5] w-full min-w-0 overflow-hidden bg-gradient-vault">
              <SmartImage
                key={active.id}
                src={active.imageUrl}
                alt={active.cardName}
                transformWidth={800}
                priority
                className="object-cover"
              />
              <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-gradient-ember px-2.5 py-1 text-xs font-bold text-primary-foreground">
                <Radio className="h-3.5 w-3.5" />
                กำลังประมูล
              </span>
              <span className="absolute top-3 right-3 rounded-full border border-accent/40 bg-background/85 px-2.5 py-1 font-display text-xs font-bold text-accent">
                {active.grade}
              </span>
            </div>

            <div className="flex min-w-0 flex-col justify-center gap-4 p-4 sm:p-6">
              <div className="min-w-0">
                <h3 className="truncate font-display text-xl font-bold">{active.cardName}</h3>
                <p className="truncate text-sm text-muted-foreground">{active.setName}</p>
              </div>

              <BigCountdown endTime={active.endTime} />

              <div className="rounded-2xl border border-border bg-secondary/50 p-3">
                <p className="text-[11px] text-muted-foreground">ราคาปัจจุบัน</p>
                <p className="font-display text-2xl font-extrabold text-primary">
                  {thb.format(active.currentBid)}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {active.bidCount} ครั้งที่เสนอ · เริ่มที่ {thb.format(active.startingPrice)}
                </p>
              </div>

              <Button
                asChild
                className="min-h-11 w-full rounded-2xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90"
              >
                <Link to="/auctions" search={{ id: active.id }}>
                  <Gavel className="h-4 w-4" />
                  เสนอราคา
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <button
          onClick={() => go(-1)}
          aria-label="รายการก่อนหน้า"
          className="absolute top-1/2 left-0 flex min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-card backdrop-blur transition-colors hover:bg-secondary lg:-left-4"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={() => go(1)}
          aria-label="รายการถัดไป"
          className="absolute top-1/2 right-0 flex min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/90 shadow-card backdrop-blur transition-colors hover:bg-secondary lg:-right-4"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="mt-5 flex justify-center gap-2">
          {items.map((a, i) => (
            <button
              key={a.id}
              aria-label={`ดู ${a.cardName}`}
              onClick={() => setIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === index ? "w-8 bg-primary" : "w-3 bg-muted-foreground/30",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
