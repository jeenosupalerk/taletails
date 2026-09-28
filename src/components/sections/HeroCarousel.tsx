import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { Button } from "@/components/ui/button";
import { getActiveBanners, type Banner } from "@/data/banners";
import banner1 from "@/assets/banner-1.jpg";
import { useBanners } from "@/hooks/useSiteContent";
import { cn } from "@/lib/utils";

const fallbackSlides = getActiveBanners();

export function HeroCarousel() {
  const [index, setIndex] = useState(0);
  // banner จากหลังบ้าน (ตาราง banners) — ยังโหลดไม่เสร็จ/ไม่มีเลย ใช้ชุดตั้งต้นในโค้ดแทน กันหน้าแรกว่าง
  const { data: dbBanners } = useBanners();
  const slides: Banner[] =
    dbBanners && dbBanners.length > 0
      ? dbBanners.map((b) => ({
          id: b.id,
          title: b.title,
          subtitle: b.subtitle ?? "",
          imageUrl: b.image_url || banner1,
          ...(b.image_url_mobile ? { imageUrlMobile: b.image_url_mobile } : {}),
          ctaText: b.cta_text ?? "",
          ctaLink: b.cta_link ?? "",
          isActive: true,
        }))
      : fallbackSlides;
  const count = slides.length;

  const go = useCallback((dir: number) => setIndex((i) => (i + dir + count) % count), [count]);

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => go(1), 7000);
    return () => window.clearInterval(id);
  }, [go, count]);
  // จำนวน banner เปลี่ยน (โหลดจากหลังบ้านเสร็จ) → กันชี้เลยใบสุดท้าย
  const current = count > 0 ? index % count : 0;

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
        {/* มือถือ 1:1 ตรงกับรูปที่ครอบในหลังบ้าน · จอใหญ่ 16:5 */}
        <div className="relative aspect-square sm:aspect-[16/5] sm:min-h-[18rem]">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === current ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={i !== current}
            >
              {/* มือถือโหลดรูป 1:1 ที่ครอบไว้ จอใหญ่โหลดรูป 16:5 — ไม่โหลดทั้งสองรูป */}
              <picture>
                {slide.imageUrlMobile && (
                  <source media="(max-width: 639px)" srcSet={slide.imageUrlMobile} />
                )}
                <img
                  src={slide.imageUrl}
                  alt={slide.title}
                  width={2400}
                  height={750}
                  loading={i === 0 ? "eager" : "lazy"}
                  className="h-full w-full object-cover"
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-fade" />
              <div className="absolute inset-0 flex items-end overflow-hidden">
                <div className="w-full p-5 sm:p-8 lg:p-10">
                  <div className="flex items-center gap-2">
                    <img
                      src={taletailsLogo}
                      alt=""
                      width={28}
                      height={28}
                      className="h-7 w-7 rounded-md object-cover"
                    />
                    <span className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
                      Taletails Originals
                    </span>
                  </div>
                  <h2 className="mt-3 max-w-2xl text-2xl leading-tight font-bold text-white sm:text-3xl lg:text-4xl">
                    {slide.title}
                  </h2>
                  <p className="mt-2 line-clamp-2 max-w-xl text-sm text-white/80 sm:text-base">
                    {slide.subtitle}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {slide.ctaText && slide.ctaLink && (
                      <Button
                        asChild
                        size="lg"
                        className="bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90"
                      >
                        {/^https?:\/\//.test(slide.ctaLink) ? (
                          <a href={slide.ctaLink} target="_blank" rel="noopener noreferrer">
                            {slide.ctaText}
                          </a>
                        ) : (
                          <Link to={slide.ctaLink as never}>{slide.ctaText}</Link>
                        )}
                      </Button>
                    )}
                    <Button asChild size="lg" variant="secondary" className="font-semibold">
                      <Link to="/marketplace">ดูตลาดซื้อขาย</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            <button
              onClick={() => go(-1)}
              aria-label="สไลด์ก่อนหน้า"
              className="absolute top-1/2 left-3 hidden min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 backdrop-blur transition-colors hover:bg-secondary sm:flex"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => go(1)}
              aria-label="สไลด์ถัดไป"
              className="absolute top-1/2 right-3 hidden min-h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/70 backdrop-blur transition-colors hover:bg-secondary sm:flex"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <div className="absolute right-6 bottom-5 flex gap-2">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  aria-label={`ไปสไลด์ที่ ${i + 1}`}
                  onClick={() => setIndex(i)}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === current ? "w-7 bg-primary" : "w-3 bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
