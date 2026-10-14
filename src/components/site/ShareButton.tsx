import { Check, Copy, Link2, Share2 } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { SITE_URL } from "@/lib/seo";
import { cn } from "@/lib/utils";

/**
 * ปุ่มแชร์ + แผ่นแชร์ (mockup share-feature) — มือถือเปิดแผ่นล่างจอ / จอคอมเปิดกล่องเล็กใต้ปุ่ม
 * ใช้ลิงก์แชร์สาธารณะของ LINE / Facebook / X ที่ไม่ต้องสมัคร app id · Messenger มีเฉพาะมือถือ (เปิดแอปตรง)
 * ลิงก์ใช้โดเมนจริงเสมอ ไม่ใช้ window.location — กันแชร์ลิงก์ localhost ตอนทดสอบ
 */
export type ShareTarget = {
  /** path ของหน้า เช่น /product/<id> */
  path: string;
  title: string;
  /** บรรทัดรอง เช่น "PSA 10 · ขายตายตัว" */
  subtitle?: string | undefined;
  /** ราคา/สถานะที่แสดงในการ์ดย่อ เช่น "฿8,000" หรือ "ราคาตอนนี้ ฿3,200 · ปิด 15 ต.ค. 21:00" */
  priceText?: string | undefined;
  imageUrl?: string | undefined;
  /** ข้อความที่เติมให้ตอนแชร์ไป LINE/X (ใส่ราคาปัจจุบันได้ เพราะเป็นข้อความ ไม่ใช่รูปที่แอปเก็บค้าง) */
  shareText: string;
};

export function ShareButton({
  target,
  className,
  label = "แชร์",
}: {
  target: ShareTarget;
  className?: string | undefined;
  label?: string | undefined;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);

  const trigger = (
    <button
      type="button"
      aria-label={label}
      onClick={isMobile ? () => setOpen(true) : undefined}
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-border transition-colors hover:bg-secondary",
        className,
      )}
    >
      <Share2 className="h-5 w-5 text-foreground" />
    </button>
  );

  if (isMobile) {
    return (
      <>
        {trigger}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent
            side="bottom"
            className="rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            <SheetHeader className="text-left">
              <SheetTitle>แชร์</SheetTitle>
              <SheetDescription className="sr-only">เลือกช่องทางแชร์ลิงก์</SheetDescription>
            </SheetHeader>
            <SharePanel target={target} mobile onDone={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-4">
        <p className="mb-3 text-sm font-semibold">แชร์</p>
        <SharePanel target={target} mobile={false} />
      </PopoverContent>
    </Popover>
  );
}

function SharePanel({
  target,
  mobile,
  onDone,
}: {
  target: ShareTarget;
  mobile: boolean;
  onDone?: (() => void) | undefined;
}) {
  const url = `${SITE_URL}${target.path}`;
  const u = encodeURIComponent(url);
  const text = encodeURIComponent(target.shareText);
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  // เมนูแชร์ของเครื่อง (IG, Telegram, AirDrop ฯลฯ) มีเฉพาะบางเบราว์เซอร์ — ตรวจหลังโหลดหน้า กัน SSR ไม่ตรงกัน
  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // http:// หรือเบราว์เซอร์เก่าไม่มี clipboard API → ใช้วิธีเลือกข้อความแทน
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (!ok) {
        toast.error("คัดลอกไม่สำเร็จ ลองกดค้างที่ลิงก์เพื่อคัดลอกเอง");
        return;
      }
    }
    setCopied(true);
    toast.success("คัดลอกลิงก์แล้ว");
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: target.title, text: target.shareText, url });
      onDone?.();
    } catch {
      // ผู้ใช้กดยกเลิก — ไม่ต้องแจ้งอะไร
    }
  };

  const channels: { key: string; label: string; href: string; icon: ReactNode; bg: string }[] = [
    {
      key: "line",
      label: "LINE",
      href: `https://social-plugins.line.me/lineit/share?url=${u}&text=${text}`,
      icon: <span className="text-[11px] font-black tracking-tight">LINE</span>,
      bg: "bg-[#06c755] text-white",
    },
    {
      key: "facebook",
      label: "Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      icon: <span className="text-xl font-black">f</span>,
      bg: "bg-[#1877f2] text-white",
    },
    ...(mobile
      ? [
          {
            key: "messenger",
            label: "Messenger",
            href: `fb-messenger://share/?link=${u}`,
            icon: <span className="text-base font-black">m</span>,
            bg: "bg-[#0084ff] text-white",
          },
        ]
      : []),
    {
      key: "x",
      label: "X",
      href: `https://twitter.com/intent/tweet?url=${u}&text=${text}`,
      icon: <span className="text-base font-black">𝕏</span>,
      bg: "bg-foreground text-background",
    },
  ];

  return (
    <div className="space-y-4">
      {/* การ์ดย่อ ให้เห็นว่ากำลังแชร์อะไร */}
      <div className="flex items-center gap-3 rounded-xl bg-secondary p-2.5">
        {target.imageUrl && (
          <img
            src={target.imageUrl}
            alt=""
            className="h-14 w-11 shrink-0 rounded-md bg-tile object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{target.title}</p>
          {target.subtitle && (
            <p className="truncate text-xs text-muted-foreground">{target.subtitle}</p>
          )}
          {target.priceText && <p className="truncate text-xs font-semibold">{target.priceText}</p>}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {channels.map((c) => (
          <a
            key={c.key}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onDone?.()}
            className="flex min-h-12 flex-col items-center gap-1.5 rounded-xl py-1 text-[11px] text-foreground hover:bg-secondary"
          >
            <span className={cn("grid h-11 w-11 place-items-center rounded-full", c.bg)}>
              {c.icon}
            </span>
            {c.label}
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          className="flex min-h-12 flex-col items-center gap-1.5 rounded-xl py-1 text-[11px] text-foreground hover:bg-secondary"
        >
          <span
            className={cn(
              "grid h-11 w-11 place-items-center rounded-full transition-colors",
              copied
                ? "bg-success text-success-foreground"
                : "bg-secondary text-foreground ring-1 ring-border",
            )}
          >
            {copied ? <Check className="h-5 w-5" /> : <Link2 className="h-5 w-5" />}
          </span>
          {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
        </button>
        {canNativeShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="flex min-h-12 flex-col items-center gap-1.5 rounded-xl py-1 text-[11px] text-foreground hover:bg-secondary"
          >
            <span className="grid h-11 w-11 place-items-center rounded-full bg-secondary ring-1 ring-border">
              <Share2 className="h-5 w-5" />
            </span>
            แอปอื่น ๆ
          </button>
        )}
      </div>

      {/* จอคอมไม่มีเมนูแชร์ของเครื่อง → มีช่องลิงก์ให้กดคัดลอกตรง ๆ */}
      {!mobile && (
        <div className="flex items-center gap-2 rounded-xl border border-border p-1.5 pl-3">
          <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
            {url.replace(/^https:\/\//, "")}
          </span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-foreground px-3 text-xs font-semibold text-background"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "คัดลอกแล้ว" : "คัดลอก"}
          </button>
        </div>
      )}
    </div>
  );
}
