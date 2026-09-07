import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import {
  LayoutGrid,
  Loader2,
  Newspaper,
  Receipt,
  ShieldAlert,
  Users,
  type LucideIcon,
} from "lucide-react";

import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

const title = "หลังบ้านผู้ดูแลระบบ — Taletails";
const description = "จัดการการ์ด คำสั่งซื้อ สลิปการชำระเงิน การจัดส่ง และสมาชิกของ Taletails";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminLayout,
});

const TABS: { to: string; label: string; hint: string; icon: LucideIcon }[] = [
  { to: "/admin", label: "การ์ดทั้งหมด", hint: "ลงขาย & ประมูล", icon: LayoutGrid },
  { to: "/admin/orders", label: "คำสั่งซื้อ", hint: "สลิป & จัดส่ง", icon: Receipt },
  { to: "/admin/members", label: "สมาชิก", hint: "สิทธิ์ & ระงับบัญชี", icon: Users },
  { to: "/admin/news", label: "ข่าวสาร", hint: "บทความ & โปรโมชัน", icon: Newspaper },
];

function AdminLayout() {
  const { isAdmin, isLoading, userId } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = TABS.find((t) => t.to === pathname) ?? TABS[0]!;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <div className="relative overflow-hidden border-b border-border/70 bg-card/40">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl"
        />
        <div className="relative mx-auto w-full max-w-7xl px-4 py-7 sm:px-6 sm:py-9 lg:px-8">
          <p className="text-[10px] font-medium tracking-[0.32em] text-muted-foreground uppercase sm:text-[11px]">
            Taletails Studio
          </p>
          <h1 className="mt-2 font-display text-[26px] leading-tight font-semibold sm:text-4xl">
            หลังบ้าน
          </h1>
          <p className="mt-2 max-w-xl text-xs leading-relaxed text-muted-foreground sm:text-sm">
            ศูนย์ควบคุมการ์ด คำสั่งซื้อ การชำระเงิน สมาชิก และข่าวสารทั้งหมดในที่เดียว
          </p>
        </div>
      </div>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {isLoading && userId ? (
          <div className="grid place-items-center py-24">
            <LogoLoader size={64} />
          </div>
        ) : !isAdmin ? (
          <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-[0_30px_70px_-60px_rgba(0,0,0,0.7)] sm:p-8">
            <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-semibold">เฉพาะผู้ดูแลระบบ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแลระบบ กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน
            </p>
            <Button asChild className="mt-5 min-h-11 rounded-xl">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : (
          <div className="lg:flex lg:items-start lg:gap-6">
            {/* Desktop sidebar */}
            <aside className="hidden lg:block lg:w-64 lg:shrink-0">
              <nav className="sticky top-24 space-y-1.5 rounded-3xl border border-border bg-card/70 p-2 shadow-[0_30px_70px_-70px_rgba(0,0,0,0.8)] backdrop-blur">
                {TABS.map((t) => {
                  const isActive = pathname === t.to;
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "grid min-h-9 w-9 shrink-0 place-items-center rounded-xl",
                          isActive ? "bg-primary-foreground/15" : "bg-secondary",
                        )}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-display text-sm font-medium">
                          {t.label}
                        </span>
                        <span
                          className={cn(
                            "block truncate text-[11px]",
                            isActive ? "text-primary-foreground/70" : "text-muted-foreground/80",
                          )}
                        >
                          {t.hint}
                        </span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </aside>

            <div className="min-w-0 flex-1">
              {/* Mobile / tablet tab scroller */}
              <nav className="mb-5 -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 no-scrollbar lg:hidden">
                {TABS.map((t) => {
                  const isActive = pathname === t.to;
                  const Icon = t.icon;
                  return (
                    <Link
                      key={t.to}
                      to={t.to}
                      className={cn(
                        "flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors",
                        isActive
                          ? "border-transparent bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </Link>
                  );
                })}
              </nav>

              <section className="rounded-3xl border border-border bg-card/60 p-4 shadow-[0_40px_90px_-80px_rgba(0,0,0,0.9)] backdrop-blur-sm sm:p-6">
                <p className="mb-4 hidden text-[11px] font-medium tracking-[0.24em] text-muted-foreground uppercase lg:block">
                  {active.hint}
                </p>
                <Outlet />
              </section>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
