import { Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, Gavel, LineChart, ShoppingBag } from "lucide-react";

import { useLiveAuctions } from "@/hooks/useLiveAuctions";

const tile =
  "flex min-h-14 shrink-0 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-secondary sm:shrink";
const icon = "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary";

/** ทางลัดใต้ banner — ให้คนเข้ามาแล้วไปหน้าที่ต้องการได้ในคลิกเดียว (มือถือเลื่อนแนวนอน) */
export function QuickActions() {
  const live = useLiveAuctions();
  const now = Date.now();
  const liveCount = (live.data ?? []).filter(
    (a) => a.outcome.outcome === "live" && new Date(a.startTime ?? 0).getTime() <= now,
  ).length;

  return (
    <nav aria-label="ทางลัด" className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-5 sm:overflow-visible sm:px-0">
        <Link to="/auctions" className={tile}>
          <span className={icon}>
            <Gavel className="h-5 w-5" />
          </span>
          <span className="text-sm leading-tight">
            <b className="font-semibold">ประมูลสด</b>
            <br />
            <span className="text-xs text-muted-foreground">
              {liveCount > 0 ? `เปิดอยู่ ${liveCount} รอบ` : "ยังไม่มีรอบเปิด"}
            </span>
          </span>
        </Link>
        <Link to="/marketplace" className={tile}>
          <span className={icon}>
            <ShoppingBag className="h-5 w-5" />
          </span>
          <span className="text-sm leading-tight">
            <b className="font-semibold">ตลาดซื้อขาย</b>
            <br />
            <span className="text-xs text-muted-foreground">ซื้อได้ทันที</span>
          </span>
        </Link>
        <Link to="/market" search={{ grade: "sqc" } as never} className={tile}>
          <span className={icon}>
            <BadgeCheck className="h-5 w-5" />
          </span>
          <span className="text-sm leading-tight">
            <b className="font-semibold">เกรดไทย SQC</b>
            <br />
            <span className="text-xs text-muted-foreground">ราคากลาง</span>
          </span>
        </Link>
        <Link to="/market" className={tile}>
          <span className={icon}>
            <LineChart className="h-5 w-5" />
          </span>
          <span className="text-sm leading-tight">
            <b className="font-semibold">สถิติราคา</b>
            <br />
            <span className="text-xs text-muted-foreground">ขายจริงล่าสุด</span>
          </span>
        </Link>
        <Link to="/points" className={tile}>
          <span className={icon}>
            <Coins className="h-5 w-5" />
          </span>
          <span className="text-sm leading-tight">
            <b className="font-semibold">แต้ม TT</b>
            <br />
            <span className="text-xs text-muted-foreground">แลกของรางวัล</span>
          </span>
        </Link>
      </div>
    </nav>
  );
}
