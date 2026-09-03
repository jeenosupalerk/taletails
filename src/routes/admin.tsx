import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Loader2, ShieldAlert } from "lucide-react";

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

const TABS = [
  { to: "/admin", label: "การ์ดทั้งหมด" },
  { to: "/admin/orders", label: "คำสั่งซื้อ" },
  { to: "/admin/members", label: "สมาชิก" },
  { to: "/admin/news", label: "ข่าวสาร" },
] as const;

function AdminLayout() {
  const { isAdmin, isLoading, userId } = useIsAdmin();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-[11px] font-medium tracking-[0.28em] text-muted-foreground uppercase">
            Taletails Studio
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold sm:text-3xl">หลังบ้าน</h1>
        </header>

        {isLoading && userId ? (
          <div className="grid place-items-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isAdmin ? (
          <div className="mx-auto max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-[0_30px_70px_-60px_rgba(0,0,0,0.7)]">
            <ShieldAlert className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-semibold">เฉพาะผู้ดูแลระบบ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              บัญชีนี้ยังไม่มีสิทธิ์ผู้ดูแลระบบ กรุณาเข้าสู่ระบบด้วยบัญชีแอดมิน
            </p>
            <Button asChild className="mt-5 rounded-xl">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : (
          <>
            <nav className="mb-6 flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
              {TABS.map((t) => {
                const active = pathname === t.to;
                return (
                  <Link
                    key={t.to}
                    to={t.to}
                    className={cn(
                      "flex h-10 shrink-0 items-center rounded-xl px-4 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {t.label}
                  </Link>
                );
              })}
            </nav>
            <Outlet />
          </>
        )}
      </main>
    </div>
  );
}
