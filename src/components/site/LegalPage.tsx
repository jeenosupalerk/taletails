import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { PageShell } from "@/components/site/PageShell";
import { CONTACT_EMAIL, POLICY_UPDATED } from "@/lib/site-info";

export interface LegalSection {
  heading: string;
  paragraphs?: ReactNode[] | undefined;
  items?: ReactNode[] | undefined;
}

/** ลิงก์อีเมลร้าน (ถ้ายังไม่ได้ตั้งค่า จะไม่โชว์ที่อยู่ปลอม) */
export function EmailLink() {
  if (!CONTACT_EMAIL) return <span className="font-medium text-foreground">อีเมลของร้าน</span>;
  return (
    <a
      href={`mailto:${CONTACT_EMAIL}`}
      className="font-medium text-primary underline underline-offset-4"
    >
      {CONTACT_EMAIL}
    </a>
  );
}

const OTHER_PAGES = [
  { to: "/purchase-policy", label: "นโยบายการซื้อและจัดส่ง" },
  { to: "/terms", label: "เงื่อนไขการใช้งาน" },
  { to: "/privacy", label: "ความเป็นส่วนตัว" },
  { to: "/contact", label: "ติดต่อเรา" },
] as const;

/** โครงหน้าข้อความยาว (นโยบาย/เงื่อนไข): หัวข้อ + ย่อหน้า + รายการ อ่านสบายบนมือถือ */
export function LegalPage({
  title,
  summary,
  sections,
  current,
}: {
  title: string;
  summary: string;
  sections: LegalSection[];
  current: (typeof OTHER_PAGES)[number]["to"];
}) {
  return (
    <PageShell title={title}>
      <article className="mx-auto max-w-3xl px-4 py-6 pb-12 sm:px-6">
        <p className="text-sm leading-relaxed text-muted-foreground">{summary}</p>
        <p className="mt-2 text-xs text-muted-foreground">ปรับปรุงล่าสุด {POLICY_UPDATED}</p>

        {sections.map((s) => (
          <section key={s.heading} className="mt-8">
            <h2 className="font-display text-lg font-semibold">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                {p}
              </p>
            ))}
            {s.items && (
              <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground marker:text-primary">
                {s.items.map((it, i) => (
                  <li key={i}>{it}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <nav
          aria-label="หน้าที่เกี่ยวข้อง"
          className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6"
        >
          {OTHER_PAGES.filter((p) => p.to !== current).map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="inline-flex min-h-11 items-center rounded-full border border-border bg-card px-4 text-[13px] font-semibold transition-colors hover:border-primary/40 active:bg-secondary"
            >
              {p.label}
            </Link>
          ))}
        </nav>
      </article>
    </PageShell>
  );
}
