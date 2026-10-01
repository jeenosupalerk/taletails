import { useEffect, useRef, useState } from "react";

import { SmartImage } from "@/components/ui/smart-image";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

/** สัดส่วนรูป (กว้าง/สูง) ที่ถือว่า "ใกล้กรอบ 4:5" → แสดงเต็มกรอบได้โดยตัดขอบไม่มาก (1:1, 4:5, 3:4) */
const COVER_MIN = 0.7;
const COVER_MAX = 1.05;

/**
 * รูปหน้าปกสินค้าในกรอบ 4:5 ของหน้าตลาด
 * - รูปสัดส่วนใกล้กรอบ → เต็มกรอบ (object-cover)
 * - รูปห่างจากกรอบมาก (แนวนอนจากกล้อง, สแลบผอมสูง, การ์ด 5:7) → แสดงทั้งรูป ไม่ตัด
 *   แล้วเติมช่องว่างด้วยรูปเดียวกันที่เบลอ ทุกใบจึงเต็มกรอบเท่ากันโดยร้านไม่ต้องแต่งรูป
 * หน้ารายละเอียดสินค้ายังใช้แกลเลอรีที่แสดงรูปเต็มเหมือนเดิม
 */
export function ProductPhoto({
  src,
  alt,
  className,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string | undefined;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [fit, setFit] = useState<"cover" | "contain">("cover");
  const [blurSrc, setBlurSrc] = useState(() => optimizedImageUrl(src, { width: 48, quality: 50 }));

  useEffect(() => {
    setBlurSrc(optimizedImageUrl(src, { width: 48, quality: 50 }));
  }, [src]);

  // อ่านขนาดจริงจาก <img> ที่ SmartImage วาด (รูปจากแคชอาจโหลดเสร็จก่อนผูก onLoad จึงเช็ก complete ด้วย)
  useEffect(() => {
    const img = box.current?.querySelector<HTMLImageElement>("img[data-photo]");
    if (!img) return;
    const measure = () => {
      if (!img.naturalWidth || !img.naturalHeight) return;
      const r = img.naturalWidth / img.naturalHeight;
      setFit(r >= COVER_MIN && r <= COVER_MAX ? "cover" : "contain");
    };
    if (img.complete) measure();
    img.addEventListener("load", measure);
    return () => img.removeEventListener("load", measure);
  }, [src]);

  return (
    <div ref={box} className="absolute inset-0">
      {fit === "contain" && blurSrc && (
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          onError={() => src && blurSrc !== src && setBlurSrc(src)}
          className="absolute inset-0 h-full w-full scale-125 object-cover blur-xl saturate-[1.1]"
        />
      )}
      <SmartImage
        src={src}
        alt={alt}
        data-photo=""
        transformWidth={600}
        className={cn(fit === "cover" ? "object-cover" : "object-contain", className)}
      />
    </div>
  );
}
