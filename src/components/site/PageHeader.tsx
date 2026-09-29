import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronRight, Home, type LucideIcon } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

import { BackButton } from "@/components/site/BackButton";

export type Crumb = {
  label: string;
  to: NonNullable<LinkProps["to"]>;
  icon?: LucideIcon | undefined;
};

/** ทุกหน้าเริ่มจากหน้าแรกเสมอ หน้าลึกส่ง trail ของตัวเองมาแทน */
const HOME_TRAIL: Crumb[] = [{ label: "หน้าแรก", to: "/", icon: Home }];

/**
 * หัวหน้าเพจแถวเดียว: ปุ่มกลับ + เส้นทาง (breadcrumb) โดยปุ่มไล่สีสุดท้ายคือชื่อหน้าปัจจุบัน
 * ใช้แทนแถบสีสูง ~257px เดิม เพื่อให้เห็นสินค้าเร็วขึ้น ชื่อหน้าเป็น h1 เพียงตัวเดียว
 * aside = ตัวเลขสถิติ/ปุ่มของหน้านั้น (ชิดขวา) ส่วน description แสดงเฉพาะจอกว้าง
 */
export function PageHeader({
  title,
  trail = HOME_TRAIL,
  icon: Icon,
  description,
  aside,
}: {
  title: string;
  trail?: Crumb[] | undefined;
  icon?: LucideIcon | undefined;
  description?: string | undefined;
  aside?: ReactNode;
}) {
  // มือถือ: เส้นทางยาวเลื่อนได้ เปิดมาให้เห็นหน้าปัจจุบัน (ท้ายสุด) เสมอ
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const toEnd = () => {
      el.scrollLeft = el.scrollWidth;
    };
    toEnd();
    // ฟอนต์โหลดเสร็จ/ขนาดเปลี่ยนทีหลัง ก็ยังเลื่อนไปท้ายเส้นทางให้เอง
    const ro = new ResizeObserver(toEnd);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [title]);

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <BackButton iconOnly className="shrink-0" />
      <nav aria-label="เส้นทางหน้า" className="min-w-0">
        <div ref={scrollRef} className="no-scrollbar overflow-x-auto rounded-full">
          <ol className="flex w-max items-center gap-0.5 rounded-full border border-border bg-card p-0.5">
            {trail.map((c) => (
              <li key={`${c.label}-${String(c.to)}`} className="flex items-center gap-0.5">
                <Link
                  to={c.to}
                  aria-label={c.label}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium whitespace-nowrap text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:px-3.5"
                >
                  {(() => {
                    const CrumbIcon = c.icon ?? (c.to === "/" ? Home : undefined);
                    return CrumbIcon ? <CrumbIcon className="h-4 w-4 text-primary" /> : null;
                  })()}
                  <span className={c.to === "/" ? "hidden sm:inline" : undefined}>{c.label}</span>
                </Link>
                <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted-foreground/50" />
              </li>
            ))}
            <li>
              <h1
                aria-current="page"
                className="inline-flex min-h-11 max-w-[14rem] items-center gap-2 rounded-full bg-gradient-to-br from-primary to-primary/80 px-4 text-sm font-semibold whitespace-nowrap text-primary-foreground shadow-[0_6px_14px_-6px_color-mix(in_oklch,var(--primary)_60%,transparent),inset_0_1px_0_oklch(1_0_0/0.28)] sm:max-w-sm"
              >
                {Icon && <Icon className="h-4 w-4 shrink-0" />}
                <span className="truncate">{title}</span>
              </h1>
            </li>
          </ol>
        </div>
      </nav>
      {aside ? (
        <div className="ml-auto shrink-0">{aside}</div>
      ) : description ? (
        <p className="ml-auto hidden max-w-[40%] truncate text-sm text-muted-foreground md:block">
          {description}
        </p>
      ) : null}
    </div>
  );
}
