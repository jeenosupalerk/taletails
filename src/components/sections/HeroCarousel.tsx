import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { Button } from "@/components/ui/button";
import { getActiveBanners } from "@/data/banners";
import { cn } from "@/lib/utils";

const slides = getActiveBanners();

type LinkTo = "/" | "/auctions" | "/marketplace" | "/vault" | "/news";

export function HeroCarousel() {
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(() => go(1), 7000);
    return () => window.clearInterval(id);
  }, [go]);

  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border shadow-card">
        <div className="relative aspect-[16/11] sm:aspect-[16/7]">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === index ? "opacity-100" : "pointer-events-none opacity-0",
              )}
              aria-hidden={i !== index}
            >
              <img
                src={slide.imageUrl}
                alt={slide.title}
                width={1600}
                height={912}
                loading={i === 0 ? "eager" : "lazy"}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-fade" />
              <div className="absolute inset-0 flex items-end">
                <div className="w-full p-6 sm:p-10 lg:p-14">
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
                  <h2 className="mt-3 max-w-2xl text-3xl leading-tight font-bold text-white sm:text-4xl lg:text-5xl">
                    {slide.title}
                  </h2>
                  <p className="mt-3 max-w-xl text-sm text-white/80 sm:text-base">
                    {slide.subtitle}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button
                      asChild
                      size="lg"
                      className="bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90"
                    >
                      <Link to={slide.ctaLink as LinkTo}>{slide.ctaText}</Link>
                    </Button>
                    <Button asChild size="lg" variant="secondary" className="font-semibold">
                      <Link to="/marketplace">ดูตลาดซื้อขาย</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

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
                i === index ? "w-7 bg-primary" : "w-3 bg-white/50",
              )}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
