import { Link, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
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
      <div className="pointer-events-auto flex w-full max-w-md min-h-13 flex-nowrap items-center justify-between gap-0.5 overflow-hidden rounded-full border border-border/60 bg-card/70 p-1.5 shadow-glow backdrop-blur-xl backdrop-saturate-150">
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
              className="relative block min-w-0 shrink"
            >
              <motion.span
                layout
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className={cn(
                  "relative flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2.5 sm:px-3 transition-colors",
                  active
                    ? "bg-gradient-ember text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
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
                      className="max-w-[4.5rem] truncate overflow-hidden text-sm font-semibold"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {showBadge && (
                  <span className="absolute -top-0.5 right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground shadow-sm">
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
