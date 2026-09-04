import { Bell, BellRing, Share } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";

/** สวิตช์เปิด/ปิดการแจ้งเตือนแบบ Push บนอุปกรณ์นี้ */
export function PushNotificationToggle() {
  const { supported, needsInstall, permission, enabled, busy, enable, disable } =
    usePushNotifications();

  const blocked = permission === "denied";

  return (
    <div className="surface-panel mt-4 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-ember text-primary-foreground">
          {enabled ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">การแจ้งเตือนบนอุปกรณ์นี้</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            รับแจ้งเตือนเมื่อมีคนเสนอราคาสูงกว่า ชนะการประมูล หรือคำสั่งซื้อมีอัปเดต
            แม้ไม่ได้เปิดเว็บค้างไว้
          </p>
        </div>
        <Switch
          aria-label="เปิดรับการแจ้งเตือน"
          checked={enabled}
          disabled={!supported || busy || blocked}
          onCheckedChange={(next) => {
            void (next ? enable() : disable());
          }}
        />
      </div>

      {!supported && (
        <p className="mt-3 text-xs text-muted-foreground">
          เบราว์เซอร์นี้ยังไม่รองรับการแจ้งเตือนแบบ Push
        </p>
      )}

      {blocked && (
        <p className="mt-3 text-xs text-destructive">
          การแจ้งเตือนถูกปิดกั้นไว้ โปรดเปิดอนุญาตในการตั้งค่าเบราว์เซอร์ก่อน
        </p>
      )}

      {supported && needsInstall && !enabled && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-secondary/70 p-2.5 text-xs text-muted-foreground">
          <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          บน iPhone/iPad ให้กด “แชร์” แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” ก่อน จึงจะเปิดรับการแจ้งเตือนได้
        </p>
      )}

      {supported && !enabled && !blocked && (
        <Button
          type="button"
          onClick={() => void enable()}
          disabled={busy}
          className="mt-3 h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground"
        >
          {busy ? "กำลังเปิด…" : "เปิดรับการแจ้งเตือน"}
        </Button>
      )}
    </div>
  );
}
