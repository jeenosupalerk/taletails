import { X } from "lucide-react";
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
}

/**
 * Product image with a hover/touch-hold magnifier lens and a click-to-open
 * full-screen lightbox.
 */
export function ZoomableImage({
  src,
  alt,
  transformWidth = 900,
  priority = false,
  zoom = 2.5,
  className,
  wrapperClassName,
}: ZoomableImageProps) {
  const ref = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | null>(null);
  const [lens, setLens] = useState<{ x: number; y: number } | null>(null);
  const [open, setOpen] = useState(false);

  const bigSrc = optimizedImageUrl(src, { width: Math.round(transformWidth * 2), resize: "contain" });

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

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

  if (!src) return <SmartImage src={src} alt={alt} className={className} wrapperClassName={wrapperClassName} />;

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
        onClick={() => setOpen(true)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
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
        </div>
      )}
    </>
  );
}
