import { Link } from "@tanstack/react-router";

import { GradeBadge } from "@/components/card/CardBits";
import { SmartImage } from "@/components/ui/smart-image";
import { pad, useCountdown } from "@/hooks/useCountdown";
import type { LiveAuction } from "@/hooks/useLiveAuctions";
import { AUCTION_OUTCOME_DOT_CLASS, AUCTION_OUTCOME_TONE_CLASS } from "@/lib/auction-status";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const HOUR = 60 * 60 * 1000;
const timeFmt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

export type AuctionCardKind = "live" | "upcoming" | "past";

/** สถานะที่ใช้แสดงผล: ตั้งเวลาเปิดไว้ = upcoming, กำลังเปิด = live, นอกนั้น = past */
export function auctionKind(a: LiveAuction, now = Date.now()): AuctionCardKind {
  if (a.outcome.outcome !== "live") return "past";
  return new Date(a.startTime ?? 0).getTime() > now ? "upcoming" : "live";
}

/** "1ว 03:21:55" / "04:56:12" / "42:18" */
function shortCountdown(c: { days: number; hours: number; minutes: number; seconds: number }) {
  if (c.days > 0) return `${c.days}ว ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
  if (c.hours > 0) return `${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
  return `${pad(c.minutes)}:${pad(c.seconds)}`;
}

/**
 * การ์ดประมูล 1 ใบ (หน้าแรก + หน้า /auctions) — หน้าตาเดียวกับการ์ดในตลาดซื้อขาย
 * กำลังประมูล = กรอบไฟวิ่ง (.live-frame) + ป้ายเวลา "สด" · เหลือไม่ถึง 1 ชม. กรอบวิ่งเร็วขึ้นและป้ายเป็นพื้นส้มเข้ม
 * กดแล้วเข้าห้องประมูล /card/$id (ที่เดียวที่เสนอราคาได้)
 */
export function AuctionCard({
  auction: a,
  className,
}: {
  auction: LiveAuction;
  className?: string | undefined;
}) {
  const kind = auctionKind(a);
  const countdown = useCountdown(kind === "upcoming" ? a.startTime : a.endTime);
  const urgent =
    kind === "live" && !!countdown && !countdown.isFinished && countdown.totalMs < HOUR;
  const muted = kind === "past" && a.outcome.tone === "muted";

  return (
    <Link
      to="/card/$id"
      params={{ id: a.cardId }}
      data-urgent={urgent}
      className={cn(
        "group flex flex-col rounded-[18px] bg-card p-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        kind === "live" ? "live-frame" : "ring-1 ring-border/70",
        className,
      )}
    >
      <div className="relative aspect-[5/7] overflow-hidden rounded-xl bg-tile">
        <SmartImage
          src={a.imageUrl}
          alt={a.cardName}
          transformWidth={500}
          className={cn(
            "object-cover transition-transform duration-500 group-hover:scale-[1.03]",
            muted && "opacity-60 grayscale-[40%]",
          )}
        />

        {kind === "past" ? (
          <span
            className={cn(
              "absolute top-2 left-2 inline-flex max-w-[85%] items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
              AUCTION_OUTCOME_TONE_CLASS[a.outcome.tone],
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 shrink-0 rounded-full",
                AUCTION_OUTCOME_DOT_CLASS[a.outcome.tone],
              )}
            />
            <span className="truncate">{a.outcome.label}</span>
          </span>
        ) : (
          countdown &&
          !countdown.isFinished && (
            <span
              role="timer"
              aria-label={
                kind === "upcoming"
                  ? `เปิดประมูลใน ${shortCountdown(countdown)}`
                  : `เหลือเวลา ${shortCountdown(countdown)}`
              }
              className={cn(
                "absolute top-2 left-2 inline-flex h-[26px] items-center gap-1.5 rounded-[9px] px-2.5 font-display text-[12.5px] font-extrabold tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
                urgent
                  ? "bg-[oklch(0.62_0.21_35)] text-white"
                  : kind === "upcoming"
                    ? "bg-card/95 text-foreground"
                    : "bg-card/95 text-[var(--cd-fg)]",
              )}
            >
              {kind === "live" && (
                <span
                  className={cn("live-dot", urgent ? "text-white" : "text-[oklch(0.62_0.22_30)]")}
                  aria-hidden
                />
              )}
              {kind === "upcoming" && "เปิดใน "}
              {shortCountdown(countdown)}
            </span>
          )
        )}

        {kind !== "upcoming" && (
          <span className="absolute bottom-2 left-2 inline-flex h-[22px] items-center rounded-full bg-foreground/70 px-2 text-[11px] font-semibold text-background backdrop-blur-sm">
            {a.bidCount > 0 ? `${a.bidCount} บิด` : "ยังไม่มีบิด"}
          </span>
        )}
        <GradeBadge grade={a.grade} company={a.gradingCompany} condition={a.conditionNote} />
      </div>

      <div className="flex flex-col px-1.5 pt-2.5 pb-1">
        <p className="truncate text-xs text-muted-foreground">
          {a.setName !== "-" ? a.setName : " "}
        </p>
        <h3 className="mt-0.5 line-clamp-2 min-h-10 text-[15px] leading-snug font-semibold break-words group-hover:text-primary">
          {a.cardName}
        </h3>
        <div className="mt-1.5 flex items-baseline justify-between gap-2">
          <p className="truncate font-display text-lg leading-tight font-bold">
            {thb.format(kind === "upcoming" ? a.startingPrice : a.currentBid)}
          </p>
          <p className="shrink-0 text-[11px] text-muted-foreground">
            {kind === "live"
              ? // ปิดภายในวันนี้บอกเวลา · ปิดวันอื่นบอกวันที่
                `ปิด ${(countdown?.days ?? 0) > 0 ? dateFmt.format(new Date(a.endTime)) : timeFmt.format(new Date(a.endTime))}`
              : kind === "upcoming"
                ? "ราคาเริ่มต้น"
                : `ปิด ${dateFmt.format(new Date(a.endTime))}`}
          </p>
        </div>
      </div>
    </Link>
  );
}
