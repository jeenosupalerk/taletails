import { ChevronLeft, ChevronRight, Images, Lock, Radio } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  /** ทำให้รูปจางลง (เช่น ขายแล้ว) */
  dimmed?: boolean | undefined;
  /**
   * มือถือ: การ์ดกลางเด่น + รูปข้าง ๆ โผล่ให้รู้ว่ามีต่อ (เตี้ยกว่าโหมดปกติ เพื่อให้ราคา/เวลาขึ้นจอแรก)
   * เดสก์ท็อปเหมือนเดิมทุกอย่าง — ใช้เฉพาะหน้าประมูล
   */
  peek?: boolean | undefined;
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
  dimmed,
  peek = false,
}: CardGalleryProps) {
  const [active, setActive] = useState(0);
  const touch = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (active > images.length - 1) setActive(0);
  }, [active, images.length]);

  const many = images.length > 1;
  const locked = status !== "available";
  // โหมด peek ไม่วนรอบ: รูปข้าง ๆ ที่โผล่มาต้องตรงกับที่ปัดไปจริง (ปลายทางไม่มีรูปข้างหลัง)
  const go = (d: number) =>
    setActive((i) =>
      peek
        ? Math.min(images.length - 1, Math.max(0, i + d))
        : (i + d + images.length) % images.length,
    );

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
                i === active
                  ? "ring-2 ring-primary"
                  : "opacity-60 ring-1 ring-border hover:opacity-100",
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
          className={cn(
            "relative mx-auto w-full overflow-hidden rounded-3xl bg-tile ring-1 ring-border/60",
            peek
              ? "h-[clamp(212px,28svh,280px)] lg:aspect-[5/7] lg:h-auto lg:max-w-[calc(600px*5/7)]"
              : "aspect-[5/7] max-w-[calc(46svh*5/7)] lg:max-w-[calc(600px*5/7)]",
          )}
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
          {/* รูปข้าง ๆ ที่โผล่ (มือถือ, โหมด peek) — กดเพื่อข้ามไปรูปนั้น */}
          {peek &&
            many &&
            ([-1, 1] as const).map((o) => {
              const i = active + o;
              const src = images[i];
              if (!src) return null;
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`ดูรูปที่ ${i + 1}`}
                  className="absolute top-1/2 left-1/2 z-0 aspect-[5/7] h-[84%] overflow-hidden rounded-2xl bg-tile opacity-60 shadow-md transition-[transform,opacity] duration-300 lg:hidden"
                  style={{ transform: `translate(${-50 + o * 69}%, -50%) scale(0.8)` }}
                >
                  <SmartImage src={src} alt="" transformWidth={300} className="object-contain" />
                </button>
              );
            })}

          {/* peek: กรอบการ์ดกลาง (มือถือ) · เดสก์ท็อปและโหมดปกติให้รูปเต็มกรอบเหมือนเดิม */}
          <div
            className={
              peek
                ? "absolute top-1/2 left-1/2 z-10 aspect-[5/7] h-[84%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl bg-tile shadow-[0_18px_34px_-14px_color-mix(in_oklch,var(--primary)_55%,transparent)] ring-2 ring-card lg:top-0 lg:left-0 lg:aspect-auto lg:h-full lg:w-full lg:translate-x-0 lg:translate-y-0 lg:rounded-none lg:shadow-none lg:ring-0"
                : "contents"
            }
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
                // peek บนมือถือ: การ์ดเล็ก จึงย่อปุ่มแว่นขยายลงและชิดมุมการ์ด (เดสก์ท็อปขนาดเดิม)
                zoomButtonClassName={
                  peek
                    ? "right-1.5 top-1.5 max-lg:h-8 max-lg:min-w-8 lg:right-3 lg:top-3"
                    : "right-3 top-3"
                }
                // เปลี่ยนรูปด้วย opacity อย่างเดียว (scale/filter ทำให้ iOS Safari ค้างภาพเบลอ)
                wrapperClassName={cn(
                  "absolute inset-0 transition-opacity duration-300 ease-out",
                  i === active ? "opacity-100" : "pointer-events-none opacity-0",
                )}
                // ไม่เว้นขอบใน และใช้ contain ไม่ใช่ cover — รูปเต็มกรอบแต่ไม่ครอปขอบการ์ด (ผู้ซื้อต้องเห็นมุม/ขอบครบ)
                className={cn("object-contain", dimmed && "opacity-50")}
              />
            ))}
          </div>

          {peek && many && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                disabled={active === 0}
                aria-label="รูปก่อนหน้า"
                className="absolute top-1/2 left-1 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground shadow-md disabled:opacity-35 lg:hidden"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                disabled={active === images.length - 1}
                aria-label="รูปถัดไป"
                className="absolute top-1/2 right-1 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-card text-foreground shadow-md disabled:opacity-35 lg:hidden"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

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

          {/* ป้ายบอกจำนวนรูป — เห็นทันทีว่าการ์ดใบนี้มีหลายรูป */}
          {many && (
            <span
              className={cn(
                "absolute left-3 z-20 inline-flex h-7 items-center gap-1.5 rounded-full bg-foreground/70 px-2.5 text-[11px] font-bold text-background backdrop-blur-sm",
                liveAuction || locked ? "top-12" : "top-3",
              )}
            >
              <Images className="h-3.5 w-3.5" />
              {active + 1}/{images.length}
            </span>
          )}

          {/* จุดบอกตำแหน่ง (มือถือ) — วางบนแถบเข้มให้เห็นชัดบนรูปพื้นสีอ่อน */}
          {many && !peek && (
            <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 flex justify-center lg:hidden">
              <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-foreground/55 px-2.5 py-1.5 backdrop-blur-sm">
                {images.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`ดูรูปที่ ${i + 1}`}
                    onClick={() => setActive(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === active ? "w-[18px] bg-background" : "w-1.5 bg-background/55",
                    )}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* แถวรูปย่อใต้รูปหลัก (มือถือ) — เดสก์ท็อปใช้แถบรูปย่อด้านซ้ายแทน */}
        {many && peek && (
          <div className="mt-1 flex justify-center lg:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`ดูรูปที่ ${i + 1}`}
                aria-current={i === active ? "true" : undefined}
                onClick={() => setActive(i)}
                className="flex h-6 items-center px-[3px]"
              >
                <span
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === active ? "w-[18px] bg-primary" : "w-1.5 bg-border",
                  )}
                />
              </button>
            ))}
          </div>
        )}
        {many && !peek && (
          <div className="no-scrollbar mt-2.5 flex overflow-x-auto px-1 lg:hidden">
            <div className="mx-auto flex w-max gap-2">
              {images.map((src, i) => (
                <button
                  key={`thumb-${src}-${i}`}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`ดูรูปที่ ${i + 1}`}
                  aria-current={i === active ? "true" : undefined}
                  className={cn(
                    "relative aspect-[5/7] w-11 shrink-0 overflow-hidden rounded-lg bg-tile transition-all",
                    i === active ? "ring-2 ring-primary" : "opacity-55 ring-1 ring-border",
                  )}
                >
                  <SmartImage src={src} alt="" transformWidth={120} className="object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
