import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
}

/**
 * Product image with a hover/touch-hold magnifier lens and a click-to-open
 * full-screen lightbox (with next/prev when a gallery is provided).
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
}: ZoomableImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);
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

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  };

  if (!src) return <SmartImage src={src} alt={alt} className={className ?? ""} wrapperClassName={wrapperClassName ?? ""} />;

  return (
    <>
      <div
        ref={ref}
        className={cn("relative h-full w-full cursor-zoom-in touch-manipulation", wrapperClassName)}
        onMouseMove={(e) => point(e.clientX, e.clientY)}
        onMouseLeave={() => setLens(null)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (!t) return;
          const { clientX, clientY } = t;
          clearHold();
          holdTimer.current = window.setTimeout(() => point(clientX, clientY), 250);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          if (t && lens) point(t.clientX, t.clientY);
        }}
        onTouchEnd={() => {
          clearHold();
          setLens(null);
        }}
        onClick={() => {
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

        aria-label={`ขยายรูป ${alt}`}
      >
        <SmartImage
          src={src}
          alt={alt}
          transformWidth={transformWidth}
          priority={priority}
          className={className}
        />
        {lens && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 rounded-xl bg-no-repeat"
            style={{
              backgroundImage: `url("${bigSrc}")`,
              backgroundSize: `${zoom * 100}% ${zoom * 100}%`,
              backgroundPosition: `${lens.x}% ${lens.y}%`,
            }}
          />
        )}
      </div>

      {open && (
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
        </div>
      )}
    </>
  );

}
