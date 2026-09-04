import { Check, CreditCard, MapPin, PackageCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "ที่อยู่จัดส่ง", icon: MapPin },
  { id: 2, label: "ชำระเงิน", icon: CreditCard },
  { id: 3, label: "เสร็จสิ้น", icon: PackageCheck },
] as const;

/** Premium 3-step progress rail for the checkout flow. */
export function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-start gap-1 rounded-3xl border border-border/70 bg-card/80 px-4 py-4 backdrop-blur">
      {steps.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        const Icon = done ? Check : s.icon;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-start gap-1">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <span
                className={cn(
                  "grid min-h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  done && "border-transparent bg-gradient-ember text-primary-foreground",
                  active &&
                    "border-primary/50 bg-primary/10 text-primary shadow-glow ring-4 ring-primary/10",
                  !done && !active && "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                <Icon className="h-[18px] w-[18px]" />
              </span>
              <span
                className={cn(
                  "truncate text-center text-[11px] font-medium transition-colors duration-500 sm:text-xs",
                  active || done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span className="mt-5 h-[2px] flex-1 overflow-hidden rounded-full bg-foreground/10">
                <span
                  className={cn(
                    "block h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
                    current > s.id ? "w-full bg-gradient-ember" : "w-0",
                  )}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
