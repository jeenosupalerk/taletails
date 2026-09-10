import { CheckCircle2, Download, Share, Smartphone } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useInstallApp } from "@/hooks/useInstallApp";

/** การ์ดเชิญชวนติดตั้งเว็บลงหน้าจอโฮมของมือถือ */
export function InstallAppCard() {
  const { installed, isIos, busy, canInstall, needsManualSteps, install } = useInstallApp();

  return (
    <div className="surface-panel mt-4 rounded-2xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid min-h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-ember text-primary-foreground">
          {installed ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : (
            <Smartphone className="h-5 w-5" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm font-bold">ติดตั้ง Taletails ลงหน้าจอมือถือ</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {installed
              ? "ติดตั้งเรียบร้อยแล้ว เปิดใช้งานได้จากไอคอนบนหน้าจอโฮม"
              : "เปิดใช้งานได้เร็วขึ้นเหมือนแอป เต็มหน้าจอ ไม่มีแถบเบราว์เซอร์"}
          </p>
        </div>
      </div>

      {canInstall && (
        <Button
          type="button"
          onClick={() => void install()}
          disabled={busy}
          className="mt-3 min-h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground transition-transform active:scale-[0.98]"
        >
          <Download className="mr-1.5 h-4 w-4" />
          {busy ? "กำลังติดตั้ง…" : "ติดตั้งแอป"}
        </Button>
      )}

      {!installed && needsManualSteps && (
        <p className="mt-3 flex items-start gap-1.5 rounded-xl bg-secondary/70 p-2.5 text-xs text-muted-foreground">
          <Share className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {isIos
            ? "บน iPhone/iPad ให้กดปุ่ม “แชร์” ใน Safari แล้วเลือก “เพิ่มไปยังหน้าจอโฮม”"
            : "หากยังไม่เห็นปุ่มติดตั้ง ให้เปิดเมนูของเบราว์เซอร์แล้วเลือก “ติดตั้งแอป” หรือ “เพิ่มไปยังหน้าจอโฮม”"}
        </p>
      )}
    </div>
  );
}
