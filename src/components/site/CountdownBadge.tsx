import { Timer } from "lucide-react";

import { pad, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

export function CountdownBadge({ endTime, className }: { endTime: string; className?: string }) {
  const c = useCountdown(endTime);

  const label = !c
    ? "--:--:--"
    : c.isFinished
      ? "ปิดประมูลแล้ว"
      : `${pad(c.days * 24 + c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;

  const urgent = !!c && !c.isFinished && c.totalMs < 3 * 60 * 60 * 1000;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-display text-xs font-semibold tabular-nums",
        urgent
          ? "border-destructive/40 bg-destructive/15 text-destructive"
          : "border-border bg-background/80 text-foreground",
        className,
      )}
    >
      <Timer className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}
