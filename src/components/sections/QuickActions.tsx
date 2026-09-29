import { Link, type LinkProps } from "@tanstack/react-router";
import { BadgeCheck, Coins, Gavel, LineChart, ShoppingBag, type LucideIcon } from "lucide-react";

import { useLiveAuctions } from "@/hooks/useLiveAuctions";
import { cn } from "@/lib/utils";

type Action = {
  to: NonNullable<LinkProps["to"]>;
  search?: Record<string, string> | undefined;
  icon: LucideIcon;
  label: string;
  /** ชื่อสั้นสำหรับมือถือ (ช่องแคบ 5 ช่องในแถวเดียว) */
  short: string;
  hint: string;
  hot?: boolean | undefined;
};

/**
 * ทางลัดใต้ banner — ให้คนเข้ามาแล้วไปหน้าที่ต้องการได้ในคลิกเดียว
 * มือถือ: ไอคอน 5 ช่องแถวเดียว (เห็นครบ ไม่ต้องเลื่อนแนวนอน) · จอกว้าง: การ์ดมีคำอธิบาย 5 คอลัมน์
 */
export function QuickActions() {
  const live = useLiveAuctions();
  const now = Date.now();
  const liveCount = (live.data ?? []).filter(
    (a) => a.outcome.outcome === "live" && new Date(a.startTime ?? 0).getTime() <= now,
  ).length;

  const actions: Action[] = [
    {
      to: "/auctions",
      icon: Gavel,
      label: "ประมูลสด",
      short: "ประมูลสด",
      hint: liveCount > 0 ? `เปิดอยู่ ${liveCount} รอบ` : "ยังไม่มีรอบเปิด",
      hot: liveCount > 0,
    },
    {
      to: "/marketplace",
      icon: ShoppingBag,
      label: "ตลาดซื้อขาย",
      short: "ตลาด",
      hint: "ซื้อได้ทันที",
    },
    {
      to: "/market",
      search: { grade: "sqc" },
      icon: BadgeCheck,
      label: "เกรดไทย SQC",
      short: "เกรดไทย",
      hint: "ราคากลาง",
    },
    {
      to: "/market",
      icon: LineChart,
      label: "สถิติราคา",
      short: "สถิติราคา",
      hint: "ขายจริงล่าสุด",
    },
    { to: "/points", icon: Coins, label: "แต้ม TT", short: "แต้ม TT", hint: "แลกของรางวัล" },
  ];

  return (
    <nav aria-label="ทางลัด" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <ul className="grid grid-cols-5 gap-1.5 sm:gap-3">
        {actions.map((a) => (
          <li key={a.label}>
            <Link
              to={a.to}
              {...(a.search ? { search: a.search as never } : {})}
              aria-label={`${a.label} ${a.hint}`}
              className="group flex min-h-11 flex-col items-center gap-1.5 rounded-2xl text-center sm:min-h-14 sm:flex-row sm:gap-3 sm:border sm:border-border sm:bg-card sm:px-4 sm:py-3 sm:text-left sm:transition-colors sm:hover:bg-secondary"
            >
              <span
                className={cn(
                  "relative grid h-[54px] w-[54px] shrink-0 place-items-center rounded-[18px] transition-transform group-active:scale-95 sm:h-10 sm:w-10 sm:rounded-xl",
                  a.hot ? "qa-tile-hot" : "qa-tile text-primary",
                )}
              >
                <a.icon className="h-[22px] w-[22px] sm:h-5 sm:w-5" />
                {/* มือถือไม่มีที่ให้คำอธิบาย: บอกจำนวนรอบประมูลที่เปิดอยู่ด้วยป้ายตัวเลขแทน */}
                {a.hot && (
                  <span className="absolute -top-1.5 -right-1.5 grid h-5 min-w-5 place-items-center rounded-full border-2 border-background bg-foreground px-1 text-[10px] font-bold text-background tabular-nums sm:hidden">
                    {liveCount}
                  </span>
                )}
              </span>
              <span className="text-[11.5px] leading-tight font-semibold text-foreground sm:hidden">
                {a.short}
              </span>
              <span className="hidden text-sm leading-tight sm:block">
                <b className="font-semibold">{a.label}</b>
                <br />
                <span className="text-xs text-muted-foreground">{a.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
