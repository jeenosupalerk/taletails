import { Lock, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { GradeBadge } from "@/components/card/CardBits";
import { SmartImage } from "@/components/ui/smart-image";
import { ZoomableImage } from "@/components/ui/image-zoom";
import { cn } from "@/lib/utils";

export interface CardGalleryProps {
  images: string[];
  alt: string;
  /** ป้าย "กำลังประมูล" มุมซ้ายบน */
  liveAuction?: boolean | undefined;
  /** สถานะการ์ด — ขายแล้ว/ถูกจองจะมีป้ายมุมขวาบน */
  status?: "available" | "locked" | "sold" | undefined;
  grade?: string | null | undefined;
  gradingCompany?: string | null | undefined;
  condition?: string | null | undefined;
  /** ทำให้รูปจางลง (เช่น ขายแล้ว) */
  dimmed?: boolean | undefined;
}

/**
 * แกลเลอรีหน้ารายละเอียดการ์ด
 * - มือถือ: รูป 5:7 สูงไม่เกิน ~46% ของจอ ปัดซ้าย/ขวาเปลี่ยนรูป มีจุดบอกตำแหน่ง
 * - เดสก์ท็อป: รูปย่อเรียงแนวตั้งด้านซ้าย รูปหลักสูงไม่เกิน 600px
 */
export function CardGallery({
  images,
  alt,
  liveAuction,
  status = "available",
  grade,
  gradingCompany,
  condition,
  dimmed,
}: CardGalleryProps) {
  const [active, setActive] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (active > images.length - 1) setActive(0);
  }, [active, images.length]);

  const many = images.length > 1;
  const locked = status !== "available";
  const go = (d: number) => setActive((i) => (i + d + images.length) % images.length);

  return (
    <section className="flex gap-3 font-body">
      {/* รูปย่อแนวตั้ง (เดสก์ท็อป) */}
      {many && (
        <div className="no-scrollbar hidden max-h-[600px] w-16 shrink-0 flex-col gap-2.5 overflow-y-auto lg:flex">
          {images.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`ดูรูปที่ ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={cn(
                "relative aspect-[5/7] w-full shrink-0 overflow-hidden rounded-lg bg-tile transition-all",
                i === active ? "ring-2 ring-primary" : "opacity-60 ring-1 ring-border hover:opacity-100",
              )}
            >
              <SmartImage src={src} alt="" transformWidth={120} className="object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* ความสูงรูปถูกจำกัด: มือถือ ≤ 46svh, เดสก์ท็อป ≤ 600px (ความกว้างคิดจากสัดส่วน 5:7) */}
        <div
          className="relative mx-auto aspect-[5/7] w-full max-w-[calc(46svh*5/7)] overflow-hidden rounded-3xl bg-tile ring-1 ring-border/60 lg:max-w-[calc(600px*5/7)]"
          onTouchStart={(e) => {
            // โหมดแว่นขยาย: ลากนิ้วคือเลื่อนเลนส์ ไม่ใช่ปัดเปลี่ยนรูป
            if ((e.target as HTMLElement).closest?.("[data-zooming]")) {
              touch.current = null;
              return;
            }
            const t = e.touches[0];
            if (t) touch.current = { x: t.clientX, y: t.clientY };
          }}
          onTouchEnd={(e) => {
            const start = touch.current;
            const t = e.changedTouches[0];
            touch.current = null;
            if (!start || !t || !many) return;
            const dx = t.clientX - start.x;
            const dy = t.clientY - start.y;
            if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
          }}
        >
          {images.map((src, i) => (
            <ZoomableImage
              key={`${src}-${i}`}
              src={src}
              alt={i === active ? alt : ""}
              transformWidth={900}
              priority={i === 0}
              galleryImages={images}
              galleryIndex={i}
              onGalleryIndexChange={setActive}
              zoomButtonClassName="right-3 top-3"
              // เปลี่ยนรูปด้วย opacity อย่างเดียว (scale/filter ทำให้ iOS Safari ค้างภาพเบลอ)
              wrapperClassName={cn(
                "absolute inset-0 transition-opacity duration-300 ease-out",
                i === active ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              className={cn("object-contain p-3 sm:p-5", dimmed && "opacity-50")}
            />
          ))}

          {liveAuction && (
            <span className="absolute top-3 left-3 z-20 inline-flex h-7 items-center gap-1.5 rounded-full bg-gradient-ember px-2.5 text-[11px] font-bold text-primary-foreground shadow-glow">
              <Radio className="h-3.5 w-3.5" />
              กำลังประมูล
            </span>
          )}
          {locked && (
            <span
              className={cn(
                "absolute top-3 z-20 inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-[11px] font-semibold shadow",
                liveAuction ? "left-auto right-14" : "left-3",
                status === "sold" ? "bg-foreground/85 text-background" : "bg-amber-500 text-white",
              )}
            >
              <Lock className="h-3 w-3" />
              {status === "sold" ? "ขายแล้ว" : "รอชำระเงิน"}
            </span>
          )}
          <GradeBadge grade={grade} company={gradingCompany} condition={condition} className="z-20 right-3 bottom-3" />

          {/* จุดบอกตำแหน่ง (มือถือ) */}
          {many && (
            <div className="absolute inset-x-0 bottom-3 z-10 flex justify-center gap-1.5 lg:hidden">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`ดูรูปที่ ${i + 1}`}
                  onClick={() => setActive(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active ? "w-5 bg-primary" : "w-1.5 bg-foreground/25",
                  )}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
