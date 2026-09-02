import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import taletailsLogo from "@/assets/taletails-logo.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { getActiveBanners } from "@/data/banners";
import { getLiveAuctions } from "@/data/auctions";
import { cn } from "@/lib/utils";

const slides = getActiveBanners();
const showcase = getLiveAuctions()[0]!;

type LinkTo = "/" | "/auctions" | "/marketplace" | "/vault" | "/news";

export function HeroBanner() {
  const [index, setIndex] = useState(0);

  const go = useCallback(
    (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length),
    [],
  );

  useEffect(() => {
    const id = window.setInterval(() => go(1), 7000);
    return () => window.clearInterval(id);
  }, [go]);

  const slide = slides[index]!;

  return (
    <section className="relative overflow-hidden bg-gradient-hero pb-10">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 pt-10 pb-6 sm:px-6 lg:grid-cols-2 lg:gap-12 lg:px-8 lg:pt-16">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1.5 backdrop-blur">
            <img
              src={taletailsLogo.url}
              alt=""
              width={22}
              height={22}
              className="h-5.5 w-5.5 rounded-md object-cover"
            />
            <span className="text-[11px] font-semibold tracking-[0.18em] text-primary uppercase">
              Taletails Originals
            </span>
          </div>

          <h2 className="mt-4 text-3xl leading-tight font-bold sm:text-4xl lg:text-5xl">
            {slide.title}
          </h2>
          <p className="mt-3 max-w-xl text-sm text-foreground/75 sm:text-base">{slide.subtitle}</p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              asChild
              className="h-11 rounded-2xl bg-gradient-ember px-6 font-semibold text-primary-foreground shadow-glow hover:opacity-90"
            >
              <Link to={slide.ctaLink as LinkTo}>{slide.ctaText}</Link>
            </Button>
            <Button
              asChild
              variant="secondary"
              className="h-11 rounded-2xl border border-border bg-background/80 px-6 font-semibold backdrop-blur"
            >
              <Link to="/marketplace">ดูตลาดซื้อขาย</Link>
            </Button>
          </div>

          <div className="mt-7 flex gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                aria-label={`ไปสไลด์ที่ ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-8 bg-primary" : "w-3 bg-foreground/25",
                )}
              />
            ))}
          </div>
        </div>

        {/* 3D pedestal showcase */}
        <div className="relative mx-auto w-full max-w-sm">
          <div className="relative z-10 -rotate-3 transform-gpu transition-transform duration-500 hover:rotate-0">
            <div className="overflow-hidden rounded-3xl border border-border/60 bg-card p-3 shadow-glow">
              <img
                src={showcase.imageUrl}
                alt={showcase.cardName}
                width={768}
                height={1024}
                className="aspect-[4/5] w-full rounded-2xl object-cover"
              />
              <div className="flex items-center justify-between px-1 py-2.5">
                <span className="truncate font-display text-sm font-semibold">
                  {showcase.cardName}
                </span>
                <span className="rounded-full border border-accent/40 px-2 py-0.5 text-[11px] font-bold text-accent">
                  {showcase.grade}
                </span>
              </div>
            </div>
          </div>

          {/* pedestal */}
          <div className="relative -mt-6 h-16">
            <div className="absolute inset-x-6 top-2 h-10 rounded-[50%] bg-foreground/15 blur-md" />
            <div className="absolute inset-x-10 top-0 h-8 rounded-[50%] border border-border/60 bg-gradient-ember opacity-80" />
          </div>

          {/* mascot */}
          <img
            src={taletailsLogo.url}
            alt="มาสคอตจิ้งจอก Taletails"
            width={96}
            height={96}
            className="absolute -right-2 bottom-2 z-20 h-20 w-20 animate-bounce rounded-full border-4 border-background object-cover shadow-card [animation-duration:3s]"
          />
          <Sparkles className="absolute top-4 -left-2 h-6 w-6 text-primary/70" />
        </div>
      </div>
    </section>
  );
}
