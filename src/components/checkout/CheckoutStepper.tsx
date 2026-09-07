import { motion } from "framer-motion";
import { Check, Lock, QrCode, PackageCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const steps = [
  { id: 1, label: "ล็อกสินค้า", icon: Lock },
  { id: 2, label: "สแกนชำระ", icon: QrCode },
  { id: 3, label: "เสร็จสิ้น", icon: PackageCheck },
] as const;

/** Premium 3-step progress rail for the checkout flow. */
export function CheckoutStepper({ current }: { current: 1 | 2 | 3 }) {
  return (
    <ol className="flex items-start gap-0 rounded-3xl border border-border/70 bg-card/80 px-3 py-4 backdrop-blur sm:px-5">
      {steps.map((s, i) => {
        const done = current > s.id;
        const active = current === s.id;
        const Icon = done ? Check : s.icon;
        const isLast = i === steps.length - 1;

        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-start justify-center">
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
              <motion.span
                animate={{ scale: active ? 1.1 : 1 }}
                transition={{ type: "spring", stiffness: 320, damping: 22 }}
                className={cn(
                  "relative grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors duration-500 sm:h-10 sm:w-10",
                  done && "border-transparent bg-gradient-ember text-primary-foreground",
                  active && "border-primary/50 bg-primary/10 text-primary shadow-glow",
                  !done && !active && "border-border bg-secondary/40 text-muted-foreground",
                )}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
                {active && (
                  <motion.span
                    className="absolute inset-0 rounded-full ring-2 ring-primary/25"
                    initial={{ opacity: 0.6, scale: 1 }}
                    animate={{ opacity: [0.5, 0, 0.5], scale: [1, 1.4, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                  />
                )}
              </motion.span>
              <span
                className={cn(
                  "h-4 text-center text-[10px] font-medium leading-tight transition-colors duration-500 sm:h-5 sm:text-xs",
                  active
                    ? "font-semibold text-primary"
                    : done
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                )}
              >
                {s.label}
              </span>
            </div>

            {!isLast && (
              <span className="mt-4 h-1.5 w-6 shrink-0 overflow-hidden rounded-full bg-foreground/10 sm:mt-5 sm:w-10">
                <motion.span
                  className="block h-full rounded-full bg-gradient-ember"
                  initial={{ width: 0 }}
                  animate={{ width: current > s.id ? "100%" : "0%" }}
                  transition={{ duration: 0.7, ease: [0.32, 0.72, 0, 1] }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
