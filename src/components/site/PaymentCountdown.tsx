import { AlarmClock } from "lucide-react";

import { formatCountdownTh, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

/** นับถอยหลังเวลาที่เหลือสำหรับชำระเงิน (วัน ชม. นา. วิ.) */
export function PaymentCountdown({
  dueAt,
  className,
}: {
  dueAt: string;
  className?: string;
}) {
  const c = useCountdown(dueAt);

  const label = !c ? "--" : c.isFinished ? "หมดเวลาชำระเงิน" : formatCountdownTh(c);
  const urgent = !!c && !c.isFinished && c.totalMs < 5 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-semibold tabular-nums",
        c?.isFinished
          ? "border-border bg-muted text-muted-foreground"
          : urgent
            ? "border-destructive/40 bg-destructive/15 text-destructive"
            : "border-primary/30 bg-primary/10 text-primary",
        className,
      )}
    >
      <AlarmClock className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
