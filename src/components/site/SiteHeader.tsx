import { Link } from "@tanstack/react-router";
import { LayoutDashboard, Search, ShoppingBag, X } from "lucide-react";
import { useState } from "react";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { NotificationsMenu } from "@/components/site/NotificationsMenu";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { WatchlistMenu } from "@/components/site/WatchlistMenu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { useIsAdmin } from "@/hooks/useAdmin";

export const navItems = [
  { label: "ประมูล", to: "/auctions" },
  { label: "ตลาดซื้อขาย", to: "/marketplace" },
  { label: "สถิติ/ตลาด", to: "/market" },
  { label: "ประเมินการ์ดสะสม", to: "/vault" },
  { label: "ข่าวสาร", to: "/news" },
] as const;

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { count } = useCart();
  const { user, isAuthenticated } = useAuth();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-header shadow-header dark:backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5">
          <img src={taletailsLogo} alt="โลโก้ Taletails Collectibles — ตลาดและประมูลการ์ดสะสม" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
          <span className="font-display text-lg font-bold tracking-tight">
            Tale<span className="text-gradient-ember">tails</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              activeProps={{ className: "bg-secondary text-foreground" }}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="relative ml-auto hidden max-w-sm flex-1 md:block">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="ค้นหาการ์ด"
            placeholder="ค้นหาการ์ด ชุด หรือรหัสการ์ด…"
            className="h-10 rounded-full border-border bg-white pl-9"
          />
        </div>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {/* Mobile: search toggle only */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="ค้นหา"
            className="h-11 w-11 md:hidden"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
          </Button>

          <div className="hidden items-center gap-1 md:flex">
            {isAdmin && (
              <Button asChild variant="ghost" size="icon" aria-label="หลังบ้าน" className="h-11 w-11">
                <Link to="/admin">
                  <LayoutDashboard className="h-5 w-5" />
                </Link>
              </Button>
            )}
            <ThemeToggle />
            <WatchlistMenu />
            <NotificationsMenu />
          </div>

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="ตะกร้าสินค้า"
            className="relative h-11 w-11"
          >
            <Link to="/checkout">
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count}
                </span>
              )}
            </Link>
          </Button>
          {isAuthenticated && user ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="บัญชีของฉัน"
              className="hidden h-10 w-10 rounded-full md:inline-flex"
            >
              <Link to="/profile">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-ember text-xs font-bold text-primary-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
              </Link>
            </Button>
          ) : (
            <Button
              asChild
              className="hidden h-10 rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90 md:inline-flex"
            >
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-border bg-background px-4 py-3 md:hidden">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              type="search"
              aria-label="ค้นหาการ์ด"
              placeholder="ค้นหาการ์ด ชุด หรือรหัสการ์ด…"
              className="h-11 rounded-full border-border bg-white pl-9"
            />
          </div>
        </div>
      )}

    </header>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TT";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "TT").toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
