import { TrendingDown, TrendingUp } from "lucide-react";

import { pad, useCountdown } from "@/hooks/useCountdown";
import { splitGrade } from "@/lib/market-price";
import { cn } from "@/lib/utils";

/**
 * ป้ายเกรดสีเข้มมุมขวาล่างของรูปการ์ด — บริษัทตัวเล็ก + เลขเกรดตัวใหญ่ (PSA / 10)
 * การ์ดไม่เกรด (Raw หรือระบุสภาพเป็นคำ เช่น Near Mint) → ป้ายขาว
 */
export function GradeBadge({
  grade,
  company,
  condition,
  className,
}: {
  grade?: string | null | undefined;
  company?: string | null | undefined;
  condition?: string | null | undefined;
  className?: string | undefined;
}) {
  const { company: co, value } = splitGrade(grade, company, condition);
  if (!value && !co) return null;
  const numeric = /^\d+(\.\d+)?$/.test(value);
  if (!numeric) {
    return (
      <span
        className={cn(
          "absolute right-2 bottom-2 max-w-[70%] truncate rounded-[10px] bg-card px-2 py-1 font-display text-[11px] font-bold text-foreground uppercase shadow-[0_6px_14px_-8px_rgba(0,0,0,0.35)] ring-1 ring-border",
          className,
        )}
      >
        {value || co}
      </span>
    );
  }
  return (
    <span
      aria-label={`เกรด ${co ? `${co} ` : ""}${value}`}
      className={cn(
        "absolute right-2 bottom-2 flex h-11 min-w-11 flex-col items-center justify-center rounded-[11px] bg-[oklch(0.3_0.03_50)] px-1.5 leading-none text-white shadow-[0_0_0_3px_var(--card),0_6px_14px_-6px_rgba(0,0,0,0.45)] sm:h-12 sm:min-w-12",
        className,
      )}
    >
      {co && <span className="mb-0.5 text-[8.5px] font-bold tracking-wider opacity-75">{co}</span>}
      <span className="font-display text-lg font-extrabold sm:text-xl">{value}</span>
    </span>
  );
}

/** ตัวนับเวลาแผ่นส้มอ่อนขนาดเล็ก สำหรับมุมรูปการ์ดประมูล */
export function MiniFlipCountdown({ endTime, className }: { endTime: string; className?: string | undefined }) {
  const c = useCountdown(endTime);
  if (!c || c.isFinished) return null;
  const urgent = c.totalMs < 5 * 60 * 1000;
  const parts = c.days >= 1 ? [`${c.days}ว`, pad(c.hours), pad(c.minutes)] : [pad(c.hours), pad(c.minutes), pad(c.seconds)];
  return (
    <span
      role="timer"
      aria-label={`เหลือเวลา ${parts.join(":")}`}
      className={cn(
        "absolute top-2 left-2 flex items-center gap-0.5 rounded-[10px] bg-card/90 px-1.5 py-1 shadow-[0_1px_4px_rgba(0,0,0,0.15)] backdrop-blur",
        className,
      )}
    >
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-0.5">
          {i > 0 && <span className="text-[11px] font-extrabold text-[var(--cd-fg)] opacity-50">:</span>}
          <span
            className={cn(
              "flip-tile rounded-[5px] px-1 py-0.5 font-display text-xs font-extrabold leading-none after:hidden",
              urgent && "flip-tile-urgent",
            )}
          >
            {p}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * ป้ายเทียบราคาที่ตั้งขายกับราคาตลาด
 * ลบ = ถูกกว่าตลาด (สีเขียว ดีสำหรับผู้ซื้อ) · บวก = สูงกว่าตลาด (สีเทา)
 */
export function MarketDiffChip({ diff, className }: { diff: number | null; className?: string | undefined }) {
  if (diff === null || !Number.isFinite(diff)) return null;
  const pct = Math.abs(diff);
  if (pct < 1) {
    return (
      <span
        className={cn("shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-muted-foreground", className)}
        title="ใกล้เคียงราคาตลาด (เฉลี่ย 3 ครั้งล่าสุดที่ขายได้)"
      >
        ≈ ราคาตลาด
      </span>
    );
  }
  const cheaper = diff < 0;
  const Icon = cheaper ? TrendingDown : TrendingUp;
  const label = `${cheaper ? "ถูกกว่า" : "สูงกว่า"}ราคาตลาด ${pct.toFixed(0)}%`;
  return (
    <span
      title={`${label} (ราคาตลาด = เฉลี่ย 3 ครั้งล่าสุดที่ขายได้)`}
      aria-label={label}
      className={cn(
        "inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular-nums",
        cheaper ? "bg-success/10 text-success" : "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="hidden sm:inline">{cheaper ? "ถูกกว่า" : "สูงกว่า"}</span>
      {pct.toFixed(0)}%
    </span>
  );
}
