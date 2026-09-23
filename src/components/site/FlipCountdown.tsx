import { Lock, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { pad, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

/** ช่วงเวลาที่ถือว่า "โค้งสุดท้าย" — ตรงกับหน้าต่างกันแซง (anti-sniping) ในฐานข้อมูล */
const URGENT_MS = 5 * 60 * 1000;

interface FlipCountdownProps {
  /** เวลาปิดประมูล (ISO) */
  endTime: string;
  /** เวลาเริ่มประมูล (ISO) — ถ้ามี จะแสดงแถบความคืบหน้า */
  startTime?: string | null | undefined;
  /** ปิดประมูลแล้ว (จากสถานะในฐานข้อมูล) */
  closed?: boolean | undefined;
  /** ข้อความผลการประมูลตอนปิด เช่น "ไม่มีผู้เสนอราคา" */
  closedLabel?: string | undefined;
  size?: "md" | "lg" | undefined;
  className?: string | undefined;
}

const timeFmt = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });
const dateFmt = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" });

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString();
}

/**
 * ตัวนับเวลาประมูลแบบแผ่นตัวเลข (โทนส้มอ่อน)
 * - เหลือมากกว่า 1 วัน: แสดง วัน : ชั่วโมง : นาที
 * - 5 นาทีสุดท้าย: เปลี่ยนเป็นโทนแดง + ป้าย "ต่อเวลาอัตโนมัติ"
 * - เมื่อเวลาปิดถูกยืดออก (มีคนเคาะช่วงท้าย): โชว์ป้าย "+2:00" ชั่วคราว
 */
export function FlipCountdown({
  endTime,
  startTime,
  closed = false,
  closedLabel,
  size = "md",
  className,
}: FlipCountdownProps) {
  const c = useCountdown(endTime);
  const finished = closed || !!c?.isFinished;
  const urgent = !finished && !!c && c.totalMs < URGENT_MS;

  // ป้าย "+m:ss" เมื่อเวลาปิดถูกยืดออก
  const prevEnd = useRef<number | null>(null);
  const [extendedBy, setExtendedBy] = useState<number | null>(null);
  useEffect(() => {
    const next = new Date(endTime).getTime();
    const prev = prevEnd.current;
    prevEnd.current = next;
    if (prev === null || next <= prev) return;
    setExtendedBy(Math.round((next - prev) / 1000));
  }, [endTime]);
  // ซ่อนป้ายหลัง 4 วินาที (แยก effect เพื่อไม่ให้ค้างเมื่อเวลาเปลี่ยนซ้ำ)
  useEffect(() => {
    if (extendedBy === null) return;
    const t = window.setTimeout(() => setExtendedBy(null), 4000);
    return () => window.clearTimeout(t);
  }, [extendedBy]);

  const units = !c
    ? [
        { v: "--", l: "ชั่วโมง" },
        { v: "--", l: "นาที" },
        { v: "--", l: "วินาที" },
      ]
    : finished
      ? [
          { v: "00", l: "ชั่วโมง" },
          { v: "00", l: "นาที" },
          { v: "00", l: "วินาที" },
        ]
      : c.days >= 1
        ? [
            { v: pad(c.days), l: "วัน" },
            { v: pad(c.hours), l: "ชั่วโมง" },
            { v: pad(c.minutes), l: "นาที" },
          ]
        : [
            { v: pad(c.hours), l: "ชั่วโมง" },
            { v: pad(c.minutes), l: "นาที" },
            { v: pad(c.seconds), l: "วินาที" },
          ];

  // คำนวณเฉพาะฝั่ง client (c เป็น null ตอน SSR) เพื่อไม่ให้ hydration ไม่ตรงกัน
  const end = new Date(endTime);
  const endLabel = !c
    ? ""
    : sameDay(end, new Date())
      ? `ปิด ${timeFmt.format(end)} น.`
      : `ปิด ${dateFmt.format(end)} ${timeFmt.format(end)} น.`;

  let pct: number | null = null;
  if (c && startTime) {
    const s = new Date(startTime).getTime();
    const e = end.getTime();
    if (e > s) pct = finished ? 100 : Math.min(100, Math.max(0, ((Date.now() - s) / (e - s)) * 100));
  }

  const lg = size === "lg";
  const ariaText = finished
    ? "ปิดประมูลแล้ว"
    : c
      ? `เหลือเวลา ${units.map((u) => `${u.v} ${u.l}`).join(" ")}`
      : "กำลังโหลดเวลา";

  return (
    <div className={cn("w-full", className)} role="timer" aria-label={ariaText} aria-live="off">
      <div className="flex items-center justify-between gap-2 text-xs">
        {finished ? (
          <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            {closedLabel ?? "ปิดประมูลแล้ว"}
          </span>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 font-semibold",
              urgent ? "text-[var(--cd-urgent)]" : "text-primary",
            )}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={cn(
                  "absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 motion-reduce:animate-none",
                  urgent ? "bg-[var(--cd-urgent)]" : "bg-primary",
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  urgent ? "bg-[var(--cd-urgent)]" : "bg-primary",
                )}
              />
            </span>
            {urgent ? "ช่วงโค้งสุดท้าย" : "กำลังประมูล"}
          </span>
        )}

        {extendedBy ? (
          <span className="inline-flex animate-in fade-in zoom-in-95 items-center gap-1 rounded-full bg-[var(--cd-urgent)] px-2 py-0.5 text-[11px] font-bold text-white">
            <Zap className="h-3 w-3" />+{Math.floor(extendedBy / 60)}:{pad(extendedBy % 60)}
          </span>
        ) : urgent ? (
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--cd-urgent)]">
            <Zap className="h-3.5 w-3.5" />
            ต่อเวลาอัตโนมัติ
          </span>
        ) : !finished ? (
          <span className="text-muted-foreground">{endLabel}</span>
        ) : null}
      </div>

      <div className={cn("mt-2.5 flex items-start", lg ? "gap-2 sm:gap-3" : "gap-1.5 sm:gap-2")}>
        {units.map((u, i) => (
          <div key={u.l + i} className="flex flex-1 items-start">
            {i > 0 && (
              <span
                className={cn(
                  "select-none px-0.5 font-display font-bold opacity-40",
                  lg ? "pt-3 text-2xl sm:pt-4 sm:text-3xl" : "pt-2.5 text-xl sm:pt-3 sm:text-2xl",
                )}
                aria-hidden
              >
                :
              </span>
            )}
            <div className="flex flex-1 flex-col items-center">
              <div
                className={cn(
                  "flip-tile grid w-full place-items-center rounded-xl font-display font-bold leading-none",
                  urgent && "flip-tile-urgent",
                  finished && "opacity-50",
                  lg ? "h-16 text-4xl sm:h-20 sm:rounded-2xl sm:text-5xl" : "h-14 text-3xl sm:h-16 sm:text-4xl",
                )}
                aria-hidden
              >
                <span key={u.v} className="relative z-10 animate-cd-flip">
                  {u.v}
                </span>
              </div>
              <span className="mt-1.5 text-[11px] text-muted-foreground">{u.l}</span>
            </div>
          </div>
        ))}
      </div>

      {pct !== null && (
        <div className="mt-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-1000 ease-linear",
                finished
                  ? "bg-muted-foreground/40"
                  : urgent
                    ? "bg-[var(--cd-urgent)]"
                    : "bg-gradient-ember",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          {startTime && (
            <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
              <span>เริ่ม {dateFmt.format(new Date(startTime))}</span>
              <span>ผ่านไปแล้ว {Math.round(pct)}%</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
