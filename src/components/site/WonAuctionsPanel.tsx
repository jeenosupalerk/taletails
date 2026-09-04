import { Link } from "@tanstack/react-router";
import { AlarmClock, Trophy } from "lucide-react";
import { useMemo } from "react";

import { PaymentCountdown } from "@/components/site/PaymentCountdown";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuctionWins, useWinsRealtime } from "@/hooks/useAuctionWins";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { thb } from "@/lib/cart";
import { SmartImage } from "@/components/ui/smart-image";

/**
 * รายการที่ชนะประมูลและยังรอชำระเงิน — แสดงในตะกร้า/หน้าชำระเงิน
 * พร้อมเวลานับถอยหลังและปุ่มไปชำระเงินของแต่ละใบ
 */
export function WonAuctionsPanel({ className }: { className?: string }) {
  const userId = useAuthUserId();
  const wins = useAuctionWins();
  useWinsRealtime(userId);

  const pending = useMemo(
    () => (wins.data ?? []).filter((o) => o.status === "pending"),
    [wins.data],
  );

  if (!userId) return null;

  if (wins.isLoading) {
    return (
      <section className={className} aria-busy="true">
        <Skeleton className="h-28 w-full rounded-2xl" />
      </section>
    );
  }

  if (pending.length === 0) return null;

  return (
    <section className={`surface-panel overflow-hidden p-4 ${className ?? ""}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-1.5 font-display text-sm font-bold">
          <Trophy className="h-4 w-4 text-primary" />
          ของที่ประมูลชนะ รอชำระเงิน
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {pending.length}
          </span>
        </h2>
        <Link to="/wins" className="text-xs font-semibold text-primary">
          ดูทั้งหมด
        </Link>
      </div>
      <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <AlarmClock className="h-3.5 w-3.5" />
        ต้องชำระภายในเวลาที่กำหนด มิฉะนั้นสิทธิ์จะถูกยกให้ผู้เสนอราคาอันดับถัดไป
      </p>

      <ul className="mt-3 space-y-3">
        {pending.map((o) => {
          const image = o.cards?.images?.[0] ?? "/taletails-logo.jpg";
          const expired = new Date(o.payment_due_at).getTime() <= Date.now();
          return (
            <li key={o.id} className="rounded-2xl border border-border bg-background/60 p-3">
              <div className="flex gap-3">
                <SmartImage
                  src={image}
                  alt={o.cards?.name ?? "การ์ดที่ชนะประมูล"}
                  transformWidth={160}
                  wrapperClassName="h-20 w-16 shrink-0 rounded-xl border border-border"
                  className="object-cover"
                />
                <div className="min-w-0 flex-1">
                  <PaymentCountdown dueAt={o.payment_due_at} />
                  <p className="mt-1.5 truncate font-display text-sm font-semibold">
                    {o.cards?.name ?? "การ์ด"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {o.cards?.set_name ?? "-"}
                    {o.cards?.grade ? ` • เกรด ${o.cards.grade}` : ""}
                  </p>
                  <p className="mt-1 font-display text-base font-bold text-primary">
                    {thb.format(Number(o.total_amount))}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    ชำระภายใน {new Date(o.payment_due_at).toLocaleString("th-TH")}
                  </p>
                </div>
              </div>
              <Button
                asChild
                className="mt-3 min-h-11 w-full rounded-xl text-sm font-semibold"
                disabled={expired}
              >
                <Link to="/checkout/$id" params={{ id: o.id }}>
                  {expired ? "หมดเวลาชำระเงิน" : "ชำระเงินตอนนี้"}
                </Link>
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
