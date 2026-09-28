import { Bell, BellRing, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

import { pad, useCountdown } from "@/hooks/useCountdown";
import { cn } from "@/lib/utils";

const whenFmt = new Intl.DateTimeFormat("th-TH", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const URGENT_MS = 60 * 60 * 1000;

/**
 * นับถอยหลังก่อนเปิดประมูล — แสดงครบ 4 ช่อง วัน / ชม. / นาที / วินาที เสมอ
 * ใช้แผ่นตัวเลขแบบเดียวกับ FlipCountdown (flip-tile, สีจาก --cd-*) ให้เข้าธีมเว็บ
 * เหลือไม่ถึง 1 ชม. เปลี่ยนเป็นโทนเร่งด่วนและกระพริบ ให้รู้สึกว่ากำลังจะเริ่ม
 */
export function UpcomingCountdown({ startTime, className }: { startTime: string; className?: string | undefined }) {
  const c = useCountdown(startTime);
  const urgent = !!c && !c.isFinished && c.totalMs < URGENT_MS;
  const units = [
    { v: c ? pad(c.days) : "--", l: "วัน" },
    { v: c ? pad(c.hours) : "--", l: "ชม." },
    { v: c ? pad(c.minutes) : "--", l: "นาที" },
    { v: c ? pad(c.seconds) : "--", l: "วินาที" },
  ];

  return (
    <div
      className={cn("w-full", className)}
      role="timer"
      aria-label={c ? `เริ่มประมูลใน ${units.map((u) => `${u.v} ${u.l}`).join(" ")}` : "กำลังโหลดเวลา"}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className={cn("inline-flex items-center gap-1.5 font-semibold", urgent ? "text-[var(--cd-urgent)]" : "text-primary")}>
          <Clock className="h-3.5 w-3.5" />
          {urgent ? "ใกล้เปิดแล้ว" : "เริ่มประมูลใน"}
        </span>
        {c && <span className="text-muted-foreground">เปิด {whenFmt.format(new Date(startTime))} น.</span>}
      </div>
      <div className="mt-2.5 grid grid-cols-4 gap-2 sm:gap-3">
        {units.map((u) => (
          <div key={u.l} className="flex flex-col items-center">
            <div
              className={cn(
                "flip-tile grid h-16 w-full place-items-center rounded-xl font-display text-4xl leading-none font-bold sm:h-20 sm:rounded-2xl sm:text-5xl",
                urgent && "flip-tile-urgent motion-safe:animate-pulse",
              )}
              aria-hidden
            >
              <span key={u.v} className="relative z-10 animate-cd-flip">
                {u.v}
              </span>
            </div>
            <span className="mt-1.5 text-[11px] text-muted-foreground">{u.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** ตัวนับเล็กสำหรับการ์ดในรายการ "เร็ว ๆ นี้" เช่น "2ว 14:37:09" */
export function MiniUpcoming({ startTime, className }: { startTime: string; className?: string | undefined }) {
  const c = useCountdown(startTime);
  if (!c || c.isFinished) return null;
  const text = `${c.days > 0 ? `${c.days}ว ` : ""}${pad(c.hours)}:${pad(c.minutes)}:${pad(c.seconds)}`;
  return (
    <span
      role="timer"
      aria-label={`เริ่มประมูลใน ${text}`}
      className={cn(
        "absolute top-2 left-2 rounded-[10px] bg-card/95 px-2 py-1 font-display text-xs font-extrabold text-[var(--cd-fg)] tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.15)]",
        className,
      )}
    >
      {text}
    </span>
  );
}

/**
 * ปุ่ม "แจ้งเตือนเมื่อเปิด" — ใช้ระบบ push เดิม: ผู้ที่เปิดรับ push ทุกคนได้แจ้งเตือน "เปิดประมูลใหม่แล้ว"
 * (trigger trg_auctions_notify_opened) จึงแค่ช่วยให้ผู้ใช้เปิดรับ push บนอุปกรณ์นี้
 */
export function NotifyWhenOpenButton({ compact = false }: { compact?: boolean }) {
  const { supported, permission, enabled, busy, enable } = usePushNotifications();
  if (!supported || permission === "denied") return null;
  if (enabled) {
    return (
      <span
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-primary",
          !compact && "w-full",
        )}
      >
        <BellRing className="h-4 w-4" /> {compact ? "แจ้งเตือนแล้ว" : "จะแจ้งเตือนทันทีที่เปิดประมูล"}
      </span>
    );
  }
  return (
    <Button
      type="button"
      onClick={() => void enable()}
      disabled={busy}
      className={cn("min-h-12 rounded-xl font-semibold hover:bg-primary hover:brightness-95", compact ? "flex-1" : "w-full")}
    >
      <Bell className="h-4 w-4" />
      {busy ? "กำลังเปิด…" : "แจ้งเตือนเมื่อเปิด"}
    </Button>
  );
}
