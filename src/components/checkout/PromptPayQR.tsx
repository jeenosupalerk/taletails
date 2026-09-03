import { Copy, Loader2 } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { buildPromptPayPayload } from "@/lib/promptpay";
import { thb } from "@/lib/cart";

/** Renders a real, scannable Thai QR (PromptPay) for the exact order amount. */
export function PromptPayQR({ amount, reference }: { amount: number; reference?: string }) {
  const info = buildPromptPayPayload(amount);
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void QRCode.toDataURL(info.payload, {
      width: 560,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#101010", light: "#ffffff" },
    }).then((url) => {
      if (alive) setSrc(url);
    });
    return () => {
      alive = false;
    };
  }, [info.payload]);

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-secondary/20 px-4 py-6">
      <div className="w-full max-w-[16rem] overflow-hidden rounded-2xl bg-white shadow-[0_18px_45px_-30px_rgba(0,0,0,0.6)]">
        <div className="bg-[#003d6b] py-2 text-center text-[11px] font-semibold tracking-[0.3em] text-white">
          THAI QR PAYMENT
        </div>
        <div className="grid aspect-square place-items-center p-3">
          {src ? (
            <img src={src} alt="QR PromptPay สำหรับชำระเงิน" className="h-full w-full" />
          ) : (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          )}
        </div>
        <div className="border-t border-black/5 px-3 pb-3 text-center">
          <p className="font-display text-sm font-semibold text-[#101010]">{info.displayName}</p>
          <p className="text-[11px] text-[#101010]/60">พร้อมเพย์ {info.displayId}</p>
        </div>
      </div>

      <div className="text-center">
        <p className="font-display text-xl font-semibold">{thb.format(amount)}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          สแกนด้วยแอปธนาคาร ยอดเงินถูกกำหนดไว้แล้ว
          {reference ? ` • อ้างอิง ${reference}` : ""}
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard.writeText(info.payload);
          toast.success("คัดลอกข้อมูล QR แล้ว");
        }}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-medium transition-colors hover:bg-secondary"
      >
        <Copy className="h-3.5 w-3.5" />
        คัดลอก QR payload
      </button>

      <p className="max-w-sm text-center text-[11px] leading-relaxed text-muted-foreground">
        เมื่อโอนสำเร็จ กรุณาแนบสลิปเพื่อให้ทีมงานยืนยันการชำระเงิน ระบบจะแจ้งผลให้คุณทางอีเมลและการ
        แจ้งเตือนในเว็บ
      </p>
    </div>
  );
}
