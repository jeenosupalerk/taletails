import { ChevronLeft, ChevronRight, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { SmartImage } from "@/components/ui/smart-image";
import { optimizedImageUrl } from "@/lib/images";
import { cn } from "@/lib/utils";

export interface ZoomableImageProps {
  src: string | undefined | null;
  alt: string;
  transformWidth?: number;
  priority?: boolean;
  /** Magnification factor (2–3 recommended). */
  zoom?: number;
  className?: string;
  wrapperClassName?: string;
  /** All images of the product — enables next/prev navigation in the lightbox. */
  galleryImages?: string[];
  /** Index of this image inside galleryImages. */
  galleryIndex?: number;
  /** Notified when the lightbox moves to another image. */
  onGalleryIndexChange?: (index: number) => void;
  /** Position classes for the magnifier toggle button (default: bottom-right). */
  zoomButtonClassName?: string;
}

/**
 * Product image with a click-to-open full-screen lightbox (with next/prev when a
 * gallery is provided) and an opt-in magnifier: the lens only follows the
 * pointer after the user taps the magnifier icon, so browsing never triggers it
 * by accident. Tap the icon again (or press Esc) to turn it off.
 */
export function ZoomableImage({
  src,
  alt,
  transformWidth = 900,
  priority = false,
  zoom = 2.5,
  className,
  wrapperClassName,
  galleryImages,
  galleryIndex = 0,
  onGalleryIndexChange,
  zoomButtonClassName,
}: ZoomableImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [zoomMode, setZoomMode] = useState(false);
  const [current, setCurrent] = useState(galleryIndex);

  const gallery = galleryImages && galleryImages.length > 1 ? galleryImages : null;
  const activeSrc = gallery ? (gallery[current] ?? src) : src;

  const bigSrc = optimizedImageUrl(activeSrc, { width: Math.round(transformWidth * 2), resize: "contain" });

  const go = (delta: number) => {
    if (!gallery) return;
    const next = (current + delta + gallery.length) % gallery.length;
    setCurrent(next);
    onGalleryIndexChange?.(next);
  };


  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  });


  useEffect(() => {
    if (!zoomMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setZoomMode(false);
        setLens(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomMode]);

  const point = (clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 100;
    const y = ((clientY - r.top) / r.height) * 100;
    if (x < 0 || y < 0 || x > 100 || y > 100) {
      setLens(null);
      return;
    }
    setLens({ x, y });
  };


  if (!src) return <SmartImage src={src} alt={alt} className={className ?? ""} wrapperClassName={wrapperClassName ?? ""} />;

  return (
    <>
      {/* group/zoom: ชี้เมาส์บนรูปแล้วปุ่มแว่นขยายเด่นขึ้น + บอกว่ากดรูปดูเต็มจอได้ (เฉพาะอุปกรณ์ที่มีเมาส์) */}
      <div className={cn("group/zoom relative h-full w-full", wrapperClassName)}>
        <div
          ref={ref}
          data-zooming={zoomMode ? "true" : undefined}
          className={cn(
            "relative h-full w-full",
            zoomMode ? "cursor-crosshair touch-none" : "cursor-zoom-in touch-manipulation",
          )}
          onMouseMove={(e) => {
            if (zoomMode) point(e.clientX, e.clientY);
          }}
          onMouseLeave={() => setLens(null)}
          onTouchStart={(e) => {
            if (!zoomMode) return;
            const t = e.touches[0];
            if (t) point(t.clientX, t.clientY);
          }}
          onTouchMove={(e) => {
            if (!zoomMode) return;
            const t = e.touches[0];
            if (t) point(t.clientX, t.clientY);
          }}
          onTouchEnd={() => {
            if (zoomMode) setLens(null);
          }}
          onClick={() => {
            // โหมดแว่นขยาย: คลิกบนรูปไม่เปิดหน้าต่างเต็มจอ เพื่อให้เลื่อนดูรายละเอียดได้
            if (zoomMode) return;
            setCurrent(galleryIndex);
            setOpen(true);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setCurrent(galleryIndex);
              setOpen(true);
            }
          }}
          aria-label={`ดูรูป ${alt} แบบเต็มจอ`}
        >
          <SmartImage
            src={src}
            alt={alt}
            transformWidth={transformWidth}
            priority={priority}
            className={className}
          />
          {zoomMode && lens && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-tile bg-no-repeat"
              style={{
                backgroundImage: `url("${bigSrc}")`,
                backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
                backgroundPosition: `${lens.x}% ${lens.y}%`,
              }}
            />
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setZoomMode((z) => !z);
            setLens(null);
          }}
          aria-pressed={zoomMode}
          aria-label={zoomMode ? "ปิดแว่นขยาย" : "เปิดแว่นขยาย"}
          title={zoomMode ? "ปิดแว่นขยาย" : "แว่นขยาย: ชี้หรือแตะบนรูปเพื่อซูม"}
          className={cn(
            "absolute z-20 flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-full shadow-md ring-1 transition-[background-color,color,padding,transform] duration-150 active:scale-90",
            zoomMode
              ? "bg-primary text-primary-foreground ring-primary"
              : "bg-card/90 text-foreground ring-border/70 backdrop-blur group-hover/zoom:bg-primary group-hover/zoom:px-3 group-hover/zoom:text-primary-foreground group-hover/zoom:ring-primary",
            zoomButtonClassName ?? "right-3 bottom-3",
          )}
        >
          {zoomMode ? <ZoomOut className="h-[18px] w-[18px]" /> : <ZoomIn className="h-[18px] w-[18px]" />}
          {!zoomMode && <span className="hidden text-xs font-semibold group-hover/zoom:inline">ซูม</span>}
        </button>

        {!zoomMode && (
          <span aria-hidden className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground/75 px-3 py-1 text-[11px] font-medium whitespace-nowrap text-background opacity-0 transition-opacity duration-150 group-hover/zoom:opacity-100">
            กดรูปเพื่อดูเต็มจอ
          </span>
        )}

        {zoomMode && !lens && (
          <span className="pointer-events-none absolute bottom-3 left-1/2 z-20 -translate-x-1/2 rounded-full bg-foreground/80 px-3 py-1 text-[11px] font-medium whitespace-nowrap text-background">
            ชี้หรือแตะบนรูปเพื่อซูม
          </span>
        )}
      </div>

      {open &&
        typeof document !== "undefined" &&
        // วาดผ่าน portal ที่ body — ไม่งั้นจะติดอยู่ใต้ header เมื่ออยู่ในกล่อง sticky
        createPortal(
        <div
          className="fixed inset-0 z-[120] flex animate-fade-in items-center justify-center bg-foreground/80 p-4 backdrop-blur-md"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={alt}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
            aria-label="ปิดรูปภาพ"
            className="absolute top-4 right-4 flex h-11 w-11 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition-opacity hover:opacity-80"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={bigSrc}
            alt={alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain drop-shadow-2xl"
          />

          {gallery && (
            <>
              <button
                type="button"
                aria-label="รูปก่อนหน้า"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute top-1/2 left-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition-opacity hover:opacity-80 sm:left-6"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                aria-label="รูปถัดไป"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute top-1/2 right-3 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-background/90 text-foreground shadow-lg transition-opacity hover:opacity-80 sm:right-6"
              >
                <ChevronRight className="h-5 w-5" />
              </button>

              <div
                className="absolute inset-x-0 bottom-5 flex justify-center gap-2"
                onClick={(e) => e.stopPropagation()}
              >
                {gallery.map((g, i) => (
                  <button
                    key={`${g}-${i}`}
                    type="button"
                    aria-label={`ดูรูปที่ ${i + 1}`}
                    aria-current={i === current ? "true" : undefined}
                    onClick={() => {
                      setCurrent(i);
                      onGalleryIndexChange?.(i);
                    }}
                    className={cn(
                      "h-2.5 rounded-full transition-all",
                      i === current ? "w-6 bg-background" : "w-2.5 bg-background/50 hover:bg-background/80",
                    )}
                  />
                ))}
              </div>
            </>
          )}
        </div>,
          document.body,
        )}
    </>
  );

}
