import type { ReactNode } from "react";

import { BackButton } from "@/components/site/BackButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export function PageShell({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="border-b border-border bg-gradient-vault">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <BackButton className="mb-5" />
            {eyebrow && (
              <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{title}</h1>
            {description && (
              <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            )}
          </div>
        </section>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
