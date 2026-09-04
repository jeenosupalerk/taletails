import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ChartLine, Flame, Home, Store, User } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const baseItems = [
  { label: "หน้าแรก", to: "/", icon: Home },
  { label: "ตลาด", to: "/marketplace", icon: Store },
  { label: "ประมูล", to: "/auctions", icon: Flame },
  { label: "สถิติ", to: "/market", icon: ChartLine },
] as const;

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuth();

  const items = [
    ...baseItems,
    { label: "บัญชี", to: isAuthenticated ? "/profile" : "/auth", icon: User },
  ] as const;

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto flex h-[52px] max-w-full items-center gap-1 overflow-hidden rounded-full border border-border/70 bg-card px-1.5 shadow-glow">

        {items.map((item) => {
          const active =
            item.to === "/"
              ? pathname === "/"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="block"
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "flex h-11 items-center justify-center gap-1.5 rounded-full px-3",
                  active ? "bg-gradient-ember text-primary-foreground" : "text-foreground",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.4 : 2} />
                <AnimatePresence initial={false}>
                  {active && (
                    <motion.span
                      key="label"
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden text-sm font-semibold whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
