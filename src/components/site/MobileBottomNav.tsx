import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ChartLine, Flame, Home, Store, User } from "lucide-react";

import { useAuth } from "@/lib/auth";
import { useNotifications } from "@/hooks/useNotifications";
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
  const { unread } = useNotifications();

  const items = [
    ...baseItems,
    { label: "บัญชี", to: isAuthenticated ? "/profile" : "/auth", icon: User },
  ] as const;

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] lg:hidden"
    >
      <div className="pointer-events-auto flex min-h-[4.5rem] w-full max-w-md flex-nowrap items-stretch justify-between gap-0.5 overflow-hidden rounded-[2rem] border border-border/60 bg-card/70 p-1.5 shadow-glow backdrop-blur-xl backdrop-saturate-150">
        {items.map((item) => {
          const active =
            item.to === "/"
              ? pathname === "/"
              : pathname === item.to || pathname.startsWith(`${item.to}/`);
          const Icon = item.icon;
          const showBadge = item.to === (isAuthenticated ? "/profile" : "/auth") && unread > 0;
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className="relative block min-w-0 flex-1"
            >
              <motion.span
                whileTap={{ scale: 0.92 }}
                transition={{ type: "spring", stiffness: 600, damping: 28, mass: 0.6 }}
                className={cn(
                  "relative flex min-h-[3.75rem] w-full flex-col items-center justify-center gap-1 rounded-[1.6rem] px-1 py-1.5",
                  active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {/* Shared morphing pill — slides between tabs via layoutId */}
                {active && (
                  <motion.span
                    layoutId="mobile-nav-pill"
                    className="absolute inset-0 rounded-full bg-gradient-ember"
                    transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.9 }}
                  />
                )}
                <motion.span
                  initial={false}
                  animate={{ scale: active ? 1.08 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 26 }}
                  className="relative z-10 flex items-center justify-center"
                >
                  <Icon className="h-5 w-5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                </motion.span>
                <motion.span
                  initial={false}
                  animate={{ opacity: active ? 1 : 0.82, scale: active ? 1 : 0.96 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  className="relative z-10 w-full truncate text-center text-[11px] font-semibold leading-none sm:text-xs"
                >
                  {item.label}
                </motion.span>
                {showBadge && (
                  <span className="absolute -top-0.5 right-0.5 z-20 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </motion.span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
