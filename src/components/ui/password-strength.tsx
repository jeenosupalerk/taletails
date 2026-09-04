import { Check, Circle } from "lucide-react";

import { cn } from "@/lib/utils";

const rules = [
  { id: "len", label: "8 ตัวอักษร", test: (v: string) => v.length >= 8 },
  { id: "upper", label: "A-Z", test: (v: string) => /[A-Z]/.test(v) },
  { id: "lower", label: "a-z", test: (v: string) => /[a-z]/.test(v) },
  { id: "digit", label: "123", test: (v: string) => /\d/.test(v) },
  { id: "symbol", label: "@#$", test: (v: string) => /[^A-Za-z0-9]/.test(v) },
] as const;

const labels = ["อ่อนมาก", "อ่อน", "พอใช้", "ดี", "แข็งแรง"] as const;

/** Premium password strength meter: soft gradient bar + inline requirement chips. */
export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const passed = rules.filter((r) => r.test(value));
  const score = passed.length;
  const pct = value.length === 0 ? 0 : Math.max(12, (score / rules.length) * 100);

  return (
    <div
      className={cn(
        "space-y-2.5 rounded-2xl border border-border/70 bg-secondary/30 p-3",
        className,
      )}
    >
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
          ความปลอดภัยรหัสผ่าน
        </span>
        <span
          className={cn(
            "text-xs font-semibold transition-colors duration-500",
            score >= 4 ? "text-success" : score >= 3 ? "text-accent" : "text-muted-foreground",
          )}
        >
          {value.length === 0 ? "—" : labels[Math.max(0, score - 1)]}
        </span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
            score >= 4 ? "bg-success" : score >= 3 ? "bg-accent" : "bg-gradient-ember",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {rules.map((r) => {
          const ok = r.test(value);
          return (
            <span
              key={r.id}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-medium transition-colors duration-300",
                ok
                  ? "border-success/40 bg-success/10 text-success"
                  : "border-border/70 bg-background/60 text-muted-foreground",
              )}
            >
              {ok ? <Check className="h-3 w-3" /> : <Circle className="h-3 w-3 opacity-50" />}
              {r.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
