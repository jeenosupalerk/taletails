import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type LinkTo = "/" | "/auctions" | "/marketplace" | "/vault" | "/news";

export function SectionHeading({
  eyebrow,
  title,
  description,
  actionLabel = "ดูทั้งหมด",
  actionTo,
}: {
  eyebrow?: ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  actionTo?: LinkTo;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && (
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            {eyebrow}
          </div>
        )}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description && (
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition-colors hover:text-foreground"
        >
          {actionLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
