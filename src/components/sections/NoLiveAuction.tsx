import { Link } from "@tanstack/react-router";
import { BellRing, Bell, Timer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/** ขั้นตอนประมูลที่ระบบทำจริง (ต่อเวลา 2 นาที = trg_bids_apply, ชำระ 24 ชม. = auction_payment_window_24h) */
const HOW_IT_WORKS = [
  "เสนอราคาได้เมื่อเข้าสู่ระบบ",
  "มีคนเสนอช่วงท้าย ระบบต่อเวลาให้อัตโนมัติ 2 นาที",
  "ผู้ชนะชำระเงินภายใน 24 ชั่วโมง",
];

/**
 * กล่องแทนห้องประมูลเมื่อยังไม่มีรอบที่เปิดอยู่
 * เดิมหน้านี้เอาการ์ดตัวอย่าง (ข้อมูลปลอม) มาแสดงเป็นประมูลสดแทน — ต้องไม่กลับไปทำแบบนั้นอีก
 * ไม่บอกเวลารอบถัดไปเพราะร้านยังไม่มีตารางตายตัว
 */
export function NoLiveAuction({ member }: { member: boolean }) {
  return member ? <MemberNotice /> : <GuestNotice />;
}

function GuestNotice() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="grid gap-8 rounded-[28px] bg-card p-6 ring-1 ring-border sm:p-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center lg:gap-12">
        <div>
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-primary">
            <Timer className="h-7 w-7" />
          </span>
          <h2 className="mt-5 font-display text-3xl leading-tight font-bold sm:text-4xl">
            ยังไม่มีประมูลเปิดอยู่ตอนนี้
          </h2>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
            รอบใหม่จะประกาศที่หน้านี้ ระหว่างนี้เลือกซื้อการ์ดราคาตายตัวในตลาดได้เลย
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="min-h-12 rounded-xl px-6 text-base font-semibold hover:bg-primary hover:brightness-95">
              <Link to="/marketplace">ไปตลาดซื้อขาย</Link>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-12 rounded-xl border-border bg-card px-5 text-base font-semibold hover:border-primary/40 hover:bg-secondary hover:text-foreground"
            >
              <Link to="/market">ดูราคากลางตลาด</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-2xl bg-secondary/60 p-5 text-sm leading-relaxed">
          <p className="font-display text-base font-semibold">ประมูลที่ Taletails ทำงานยังไง</p>
          <ol className="mt-3 space-y-2.5">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step} className="flex gap-2.5">
                <span className="font-bold text-primary">{i + 1}</span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function MemberNotice() {
  const { supported, needsInstall, permission, enabled, busy, enable } = usePushNotifications();
  // เบราว์เซอร์ไม่รองรับ/ถูกบล็อก → ซ่อนปุ่ม ไม่ให้กดแล้วไม่เกิดอะไร
  const canAsk = supported && permission !== "denied";

  return (
    <section className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-5 rounded-3xl bg-card p-6 ring-1 ring-border sm:flex-row sm:items-center sm:p-8">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary text-primary">
          <Timer className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-2xl font-bold">ยังไม่มีประมูลเปิดอยู่ตอนนี้</h2>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            {enabled
              ? "เปิดแจ้งเตือนไว้แล้ว เราจะบอกทันทีที่เปิดรอบใหม่"
              : "เปิดแจ้งเตือนไว้ แล้วเราจะบอกทันทีที่เปิดรอบใหม่"}
          </p>
          {canAsk && needsInstall && !enabled && (
            <p className="mt-2 text-xs text-muted-foreground">
              บน iPhone/iPad ให้กด “แชร์” แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” ก่อน จึงจะเปิดแจ้งเตือนได้
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2.5">
          {canAsk &&
            (enabled ? (
              <span className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-secondary px-4 text-sm font-semibold text-primary">
                <BellRing className="h-4 w-4" /> เปิดแจ้งเตือนแล้ว
              </span>
            ) : (
              <Button
                type="button"
                onClick={() => void enable()}
                disabled={busy || needsInstall}
                className="min-h-12 rounded-xl px-5 text-base font-semibold hover:bg-primary hover:brightness-95"
              >
                <Bell className="h-4 w-4" />
                {busy ? "กำลังเปิด…" : "แจ้งเตือนเมื่อเปิดรอบใหม่"}
              </Button>
            ))}
          <Button
            asChild
            variant="outline"
            className="min-h-12 rounded-xl border-border bg-card px-5 text-base font-semibold hover:border-primary/40 hover:bg-secondary hover:text-foreground"
          >
            <Link to="/marketplace">ไปตลาดซื้อขาย</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
