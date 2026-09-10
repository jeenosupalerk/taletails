import { BellRing, Share } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { usePushNotifications } from "@/hooks/usePushNotifications";

const askedKey = (userId: string) => `taletails-push-prompt-${userId}`;

/**
 * ชวนผู้ใช้เปิดรับการแจ้งเตือนบนหน้าจอล็อกของเครื่อง (แสดงครั้งเดียวต่อบัญชี/อุปกรณ์)
 * บน iPhone จะแนะนำให้ "เพิ่มไปยังหน้าจอโฮม" ก่อน เพราะระบบ iOS บังคับไว้
 */
export function PushPermissionPrompt() {
  const userId = useAuthUserId();
  const { supported, needsInstall, permission, enabled, busy, enable } = usePushNotifications();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!userId || !supported || enabled) return;
    if (permission === "denied") return;
    try {
      if (window.localStorage.getItem(askedKey(userId)) === "1") return;
    } catch {
      /* localStorage ไม่พร้อมใช้งาน */
    }
    const timer = window.setTimeout(() => setOpen(true), 1500);
    return () => window.clearTimeout(timer);
  }, [userId, supported, enabled, permission]);

  const remember = () => {
    if (!userId) return;
    try {
      window.localStorage.setItem(askedKey(userId), "1");
    } catch {
      /* ไม่ต้องทำอะไร */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) remember();
      }}
    >
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <span className="mx-auto flex min-h-12 w-12 items-center justify-center rounded-2xl bg-gradient-ember text-primary-foreground shadow-glow">
            <BellRing className="h-6 w-6" />
          </span>
          <DialogTitle className="text-center font-display text-base">
            เปิดแจ้งเตือนบนหน้าจอล็อก
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            รับแจ้งเตือนเด้งบนหน้าจอเครื่องทันที เมื่อมีคนเสนอราคาสูงกว่า ชนะการประมูล
            ใกล้หมดเวลาชำระเงิน หรือคำสั่งซื้อมีอัปเดต — แม้ปิดเว็บไปแล้ว
          </DialogDescription>
        </DialogHeader>

        {needsInstall && (
          <p className="flex items-start gap-1.5 rounded-xl bg-secondary/70 p-2.5 text-xs text-muted-foreground">
            <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            บน iPhone/iPad ให้กด “แชร์” แล้วเลือก “เพิ่มไปยังหน้าจอโฮม” ก่อน
            แล้วเปิดแอปจากหน้าจอโฮมเพื่อเปิดรับการแจ้งเตือน
          </p>
        )}

        <DialogFooter className="gap-2 sm:flex-col">
          <Button
            className="min-h-11 w-full rounded-xl bg-gradient-ember text-sm font-semibold text-primary-foreground"
            disabled={busy || needsInstall}
            onClick={() => {
              remember();
              void enable().then(() => setOpen(false));
            }}
          >
            {busy ? "กำลังเปิด…" : "เปิดการแจ้งเตือน"}
          </Button>
          <Button
            variant="secondary"
            className="min-h-11 w-full rounded-xl text-sm"
            onClick={() => {
              remember();
              setOpen(false);
            }}
          >
            ไว้ภายหลัง
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
