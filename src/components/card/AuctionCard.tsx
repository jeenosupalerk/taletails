import { Link } from "@tanstack/react-router";
import { Gavel } from "lucide-react";

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

/** แผ่นตัวเลขมีหน่วยกำกับ: กำลังประมูล ชม./นาที/วินาที (สีส้ม, <1 ชม. สีแดง) · รอเปิด วัน/ชม./นาที/วินาที (สีเทา) */
function CountdownTiles({
  countdown: c,
  kind,
  urgent,
  compact = false,
}: {
  countdown: { days: number; hours: number; minutes: number; seconds: number };
  kind: "live" | "upcoming";
  urgent: boolean;
  /** มือถือแบบแนวนอน: แผ่นเตี้ยลง */
  compact?: boolean;
}) {
  // มีช่อง "วัน" เมื่อเหลือตั้งแต่ 1 วันขึ้นไปเท่านั้น (00 วัน ไม่มีความหมาย และทำให้ตัวเลขแคบ)
  const withDays = c.days > 0;
  const units = [
    ...(withDays ? [{ v: c.days, l: "วัน" }] : []),
    { v: c.hours, l: "ชม." },
    { v: c.minutes, l: "นาที" },
    { v: c.seconds, l: "วินาที" },
  ];
  return (
    <div
      role="timer"
      aria-label={`${kind === "upcoming" ? "เปิดประมูลใน" : "เหลือเวลา"} ${units.map((u) => `${u.v} ${u.l}`).join(" ")}`}
      className={cn(
        "mt-2 grid gap-1.5",
        compact && "max-sm:gap-1",
        withDays ? "grid-cols-4" : "grid-cols-3",
      )}
    >
      {units.map((u) => (
        <div key={u.l} className="text-center">
          <span
            className={cn(
              "grid h-[34px] place-items-center rounded-[9px] font-display text-lg font-extrabold tabular-nums",
              compact && "max-sm:h-7 max-sm:text-[15px]",
              kind === "upcoming"
                ? "bg-muted text-foreground/75"
                : urgent
                  ? "bg-gradient-to-b from-[var(--cd-urgent-top)] from-50% to-[var(--cd-urgent-bottom)] to-50% text-[var(--cd-urgent-fg)]"
                  : "bg-gradient-to-b from-[var(--cd-top)] from-50% to-[var(--cd-bottom)] to-50% text-[var(--cd-fg)]",
            )}
          >
            {pad(u.v)}
          </span>
          <span className="mt-0.5 block text-[10px] text-muted-foreground">{u.l}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * การ์ดประมูล 1 ใบ (หน้าแรก + หน้า /auctions) — หน้าตาเดียวกับการ์ดในตลาดซื้อขาย
 * กำลังประมูล = กรอบไฟวิ่ง (.live-frame) + ป้ายเวลา "สด" · เหลือไม่ถึง 1 ชม. กรอบวิ่งเร็วขึ้นและป้ายเป็นพื้นส้มเข้ม
 * กดแล้วเข้าห้องประมูล /card/$id (ที่เดียวที่เสนอราคาได้)
 */
export function AuctionCard({
  auction: a,
  className,
  rowOnMobile = false,
}: {
  auction: LiveAuction;
  className?: string | undefined;
  /** มือถือ: เรียงแนวนอน (รูปเล็กซ้าย ข้อมูลขวา) สูง ~140px แทนการ์ดตั้ง ~460px · จอ sm ขึ้นไปเป็นการ์ดตั้งตามเดิม */
  rowOnMobile?: boolean;
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
        "group flex flex-col rounded-[20px] bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        kind === "live" ? "live-frame p-1" : "p-2 ring-1 ring-border/70",
        rowOnMobile && "max-sm:flex-row max-sm:gap-3",
        className,
      )}
    >
      <div
        className={cn(
          "relative aspect-[5/7] overflow-hidden rounded-xl bg-tile",
          rowOnMobile && "max-sm:w-[88px] max-sm:shrink-0 max-sm:self-start",
        )}
      >
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
        ) : kind === "live" ? (
          <span
            className={cn(
              "absolute top-2 left-2 inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-bold text-white",
              "bg-[oklch(0.62_0.21_35)]",
              rowOnMobile &&
                "max-sm:top-1.5 max-sm:left-1.5 max-sm:h-[21px] max-sm:px-2 max-sm:text-[11px]",
            )}
          >
            <span className="live-dot text-white" aria-hidden />
            สด
          </span>
        ) : (
          <span
            className={cn(
              "absolute top-2 left-2 inline-flex h-[26px] items-center rounded-full bg-foreground/80 px-2.5 text-xs font-bold text-background",
              rowOnMobile &&
                "max-sm:top-1.5 max-sm:left-1.5 max-sm:h-[21px] max-sm:px-2 max-sm:text-[11px]",
            )}
          >
            รอเปิด
          </span>
        )}

        {kind !== "upcoming" && (
          <span
            className={cn(
              "absolute bottom-2 left-2 inline-flex h-[22px] items-center rounded-full bg-foreground/70 px-2 text-[11px] font-semibold text-background backdrop-blur-sm",
              rowOnMobile && "max-sm:hidden",
            )}
          >
            {a.bidCount > 0 ? `${a.bidCount} บิด` : "ยังไม่มีบิด"}
          </span>
        )}
        <GradeBadge
          grade={a.grade}
          company={a.gradingCompany}
          condition={a.conditionNote}
          className={rowOnMobile ? "max-sm:hidden" : undefined}
        />
      </div>

      <div
        className={cn(
          "flex flex-col px-1.5 pt-2.5 pb-1",
          rowOnMobile &&
            "max-sm:min-w-0 max-sm:flex-1 max-sm:justify-center max-sm:px-0 max-sm:py-0.5",
        )}
      >
        <p className={cn("truncate text-xs text-muted-foreground", rowOnMobile && "max-sm:hidden")}>
          {a.setName !== "-" ? a.setName : " "}
        </p>
        {rowOnMobile && (
          <p className="truncate text-[11px] text-muted-foreground sm:hidden">
            {[
              a.setName !== "-" ? a.setName : null,
              kind === "upcoming"
                ? "ราคาเริ่มต้น"
                : a.bidCount > 0
                  ? `${a.bidCount} บิด`
                  : "ยังไม่มีบิด",
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        )}
        <h3
          className={cn(
            "mt-0.5 line-clamp-2 min-h-10 text-[15px] leading-snug font-semibold break-words group-hover:text-primary",
            rowOnMobile && "max-sm:line-clamp-1 max-sm:min-h-0 max-sm:leading-tight",
          )}
        >
          {a.cardName}
        </h3>
        {kind !== "past" && countdown && !countdown.isFinished && (
          <CountdownTiles countdown={countdown} kind={kind} urgent={urgent} compact={rowOnMobile} />
        )}
        <div
          className={cn(
            "mt-2 flex items-baseline justify-between gap-2",
            rowOnMobile && "max-sm:mt-1.5",
          )}
        >
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

/** แถบแนวนอน 1 รายการ (ใกล้ปิดที่สุดใน /auctions, หน้าแรกตอนมี 1-2 รายการ) — ปุ่มเสนอราคาพาไปหน้าการ์ด */
export function AuctionStrip({
  auction: a,
  label,
  className,
}: {
  auction: LiveAuction;
  label: string;
  className?: string | undefined;
}) {
  const c = useCountdown(a.endTime);
  const urgent = !!c && !c.isFinished && c.totalMs < 60 * 60 * 1000;
  const left = c
    ? c.days > 0
      ? `${c.days} วัน ${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`
      : `${c.hours > 0 ? `${pad(c.hours)}:` : ""}${pad(c.minutes)}:${pad(c.seconds)}`
    : "";
  return (
    <Link
      to="/card/$id"
      params={{ id: a.cardId }}
      data-urgent={urgent}
      className={cn(
        "live-frame group flex items-center gap-3 rounded-[18px] bg-card p-3 sm:gap-5 sm:p-4",
        className,
      )}
    >
      <div className="relative aspect-[5/7] w-[74px] shrink-0 overflow-hidden rounded-xl bg-tile sm:w-[96px]">
        <SmartImage
          src={a.imageUrl}
          alt={a.cardName}
          transformWidth={240}
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--cd-fg)] sm:text-sm">
          <span className="live-dot text-[oklch(0.62_0.22_30)]" aria-hidden />
          {label} <span className="font-display tabular-nums">{left}</span>
        </p>
        <p className="mt-0.5 line-clamp-2 font-semibold break-words group-hover:text-primary sm:text-lg">
          {a.cardName}
        </p>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-muted-foreground">
          <span>ราคาปัจจุบัน</span>
          <span className="font-display text-lg font-bold text-foreground sm:text-xl">
            {thb.format(a.currentBid)}
          </span>
          <span>{a.bidCount > 0 ? `${a.bidCount} บิด` : "ยังไม่มีบิด"}</span>
        </p>
      </div>
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-ember text-primary-foreground sm:hidden"
        aria-hidden
      >
        <Gavel className="h-4 w-4" />
      </span>
      <span className="hidden min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-gradient-ember px-5 text-sm font-semibold text-primary-foreground sm:inline-flex">
        <Gavel className="h-4 w-4" /> เสนอราคา
      </span>
    </Link>
  );
}
