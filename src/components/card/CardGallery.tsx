import { Radio, Lock } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

export interface CardGalleryProps {
  images: string[];
  alt: string;
  /** Show the "LIVE AUCTION" pill top-left. */
  liveAuction?: boolean;
  /** Card status for the top-right lock/sold pill. */
  status?: "available" | "locked" | "sold";
  /** Optional grade badge text top-right (shown when status is available). */
  gradeBadge?: string;
}

/**
 * Premium image gallery for the Card Detail page.
 *
 * Main image is a large centered plate wrapped in a double-bezel (outer shell +
 * inner core). Thumbnails float as a bottom inner overlay inside the main image
 * plate — small rounded squares, active = opacity-1 + bright ring, inactive =
 * opacity-50. No nav arrows, no "2/4" counter. Badges stay floating top corners.
 */
export function CardGallery({
  images,
  alt,
  liveAuction,
  status = "available",
  gradeBadge,
}: CardGalleryProps) {
  const [active, setActive] = useState(0);

  // Clamp the active index when the image set changes (e.g. after fetch).
  useEffect(() => {
    if (active > images.length - 1) setActive(0);
  }, [active, images.length]);

  const hasThumbs = images.length > 1;
  const locked = status !== "available";

  return (
    <section className="font-body">
      {/* Outer shell (double-bezel) */}
      <div className="rounded-[2rem] bg-secondary/50 p-2 ring-1 ring-border/60 shadow-[0_24px_60px_-34px_oklch(0.3_0.03_55/0.45)]">
        {/* Inner core */}
        <div className="relative overflow-hidden rounded-[calc(2rem-0.5rem)] bg-card shadow-[inset_0_1px_1px_oklch(1_0_0/0.18)]">
          <div className="relative aspect-[4/5]">
            {/* Main image */}
            {images.map((src, i) => (
              <img
                key={`${src}-${i}`}
                src={src}
                alt={i === active ? `${alt}` : ""}
                aria-hidden={i !== active}
                className={cn(
                  "absolute inset-0 h-full w-full object-contain p-8 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  i === active
                    ? "opacity-100 blur-0 scale-100"
                    : "opacity-0 blur-md scale-[1.03] pointer-events-none",
                )}
                loading={i === 0 ? "eager" : "lazy"}
              />
            ))}

            {/* Badges — top corners */}
            {liveAuction && (
              <span className="absolute top-5 left-5 z-20 inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground/90 px-3 text-[11px] font-medium tracking-wide text-background backdrop-blur-md">
                <Radio className="h-3 w-3" />
                LIVE AUCTION
              </span>
            )}
            {locked ? (
              <span className="absolute top-5 right-5 z-20 inline-flex h-8 items-center gap-1.5 rounded-full bg-background/90 px-3 text-[11px] font-medium tracking-wide backdrop-blur-md">
                <Lock className="h-3 w-3" />
                {status === "sold" ? "ขายแล้ว" : "ถูกจองแล้ว"}
              </span>
            ) : (
              gradeBadge && (
                <span className="absolute top-5 right-5 z-20 inline-flex h-8 items-center gap-1.5 rounded-full bg-background/85 px-3 text-[11px] font-medium tracking-wide backdrop-blur-md">
                  {gradeBadge}
                </span>
              )
            )}

            {/* Bottom inner overlay — thumbnails */}
            {hasThumbs && (
              <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center px-4 pb-4">
                <div className="flex max-w-full gap-2.5 overflow-x-auto rounded-full bg-background/35 p-1.5 backdrop-blur-md ring-1 ring-white/15 no-scrollbar">
                  {images.map((src, i) => (
                    <button
                      key={`${src}-${i}`}
                      type="button"
                      onClick={() => setActive(i)}
                      aria-label={`ดูรูปที่ ${i + 1}`}
                      aria-current={i === active ? "true" : undefined}
                      className={cn(
                        "relative h-10 w-10 shrink-0 overflow-hidden rounded-xl transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                        i === active
                          ? "opacity-100 ring-2 ring-white/90 shadow-[0_4px_14px_-4px_oklch(0.3_0.03_55/0.6)]"
                          : "opacity-50 hover:opacity-90 ring-1 ring-white/10",
                      )}
                    >
                      <img
                        src={src}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
