import { Link, createFileRoute, useRouter } from "@tanstack/react-router";
import {
  ChevronRight,
  Coins,
  CreditCard,
  Hammer,
  Headphones,
  Heart,
  LogOut,
  MapPin,
  Moon,
  Package,
  Settings,
  ShieldCheck,
  Store,
  Sun,
  Trophy,
  Truck,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { InstallAppCard } from "@/components/site/InstallAppCard";
import { PushNotificationToggle } from "@/components/site/PushNotificationToggle";
import { PageShell } from "@/components/site/PageShell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Switch } from "@/components/ui/switch";
import { useIsAdmin, useIsSeller } from "@/hooks/useAdmin";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { usePointsBalance } from "@/hooks/usePoints";
import { PointsBalanceCard } from "@/routes/points";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/lib/auth";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "บัญชีของฉัน | Taletails";
const description =
  "จัดการโปรไฟล์ ติดตามคำสั่งซื้อ รายการโปรด และตั้งค่าบัญชีของคุณบน Taletails";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/profile` }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user, isAuthenticated, logout } = useAuth();
  const { isSeller } = useIsSeller();
  const { isAdmin } = useIsAdmin();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    void router.navigate({ to: "/auth" });
  };

  return (
    <PageShell title="บัญชีของฉัน" description="จัดการบัญชีและกิจกรรมของคุณ">
      <section className="mx-auto max-w-2xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {!isAuthenticated || !user ? (
          <div className="surface-panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <User className="min-h-10 w-10 text-primary" />
            <div>
              <p className="font-semibold">ยังไม่ได้เข้าสู่ระบบ</p>
              <p className="text-sm text-muted-foreground">
                เข้าสู่ระบบเพื่อดูข้อมูลบัญชีและกิจกรรมของคุณ
              </p>
            </div>
            <Button
              asChild
              className="min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground"
            >
              <Link to="/auth">เข้าสู่ระบบ / สมัครสมาชิก</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header */}
            <div className="surface-panel p-5">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 rounded-full border-2 border-primary/20">
                  <AvatarFallback className="bg-gradient-ember text-lg font-bold text-primary-foreground">
                    {initials(user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold">{user.name}</h2>
                  <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="mt-5">
                <PointsSummary />
              </div>
            </div>

            <InstallAppCard />

            <PushNotificationToggle />

            {isAdmin && (
              <MenuGroup title="สำหรับผู้ดูแลระบบ">
                <MenuItem
                  to="/admin"
                  icon={<ShieldCheck className="h-5 w-5" />}
                  label="หลังบ้าน (แอดมิน)"
                />
              </MenuGroup>
            )}

            {isSeller && (
              <MenuGroup title="สำหรับผู้ขาย">
                <MenuItem
                  to="/shop"
                  icon={<Store className="h-5 w-5" />}
                  label="ร้านของฉัน"
                />
              </MenuGroup>
            )}

            {/* My Activities */}
            <MenuGroup title="กิจกรรมของฉัน">
              <MenuItem
                to="/points"
                icon={<Coins className="h-5 w-5" />}
                label="ประวัติแต้ม TT Points"
              />
              <MenuItem
                to="/wins"
                icon={<Trophy className="h-5 w-5" />}
                label="ของที่ประมูลชนะ"
              />
              <MenuItem
                to="/auctions"
                icon={<Hammer className="h-5 w-5" />}
                label="ประวัติการประมูล"
                suffix={<Badge className="h-5 min-w-5 rounded-full bg-destructive px-1.5 text-[10px] text-destructive-foreground">2</Badge>}
              />
              <MenuItem
                to="/orders"
                icon={<Package className="h-5 w-5" />}
                label="คำสั่งซื้อของฉัน"
              />
              <MenuItem
                to="/purchases"
                icon={<Truck className="h-5 w-5" />}
                label="สถานะการซื้อสินค้า"
              />
              <MenuItem
                to="/wishlist"
                icon={<Heart className="h-5 w-5" />}
                label="รายการโปรด"
              />
            </MenuGroup>

            {/* Account Settings */}
            <MenuGroup title="ตั้งค่าบัญชี">
              <MenuItem
                to="/addresses"
                icon={<MapPin className="h-5 w-5" />}
                label="ที่อยู่สำหรับจัดส่ง"
              />
              <MenuItem
                to="/checkout"
                icon={<CreditCard className="h-5 w-5" />}
                label="ช่องทางการชำระเงิน"
              />
              <MenuItem
                to="/auth"
                icon={<Settings className="h-5 w-5" />}
                label="ตั้งค่าบัญชีและรหัสผ่าน"
              />
              <ThemeRow />
            </MenuGroup>

            {/* Help & Logout */}
            <MenuGroup title="ช่วยเหลือ">
              <MenuItem
                to="/news"
                icon={<Headphones className="h-5 w-5" />}
                label="ศูนย์ช่วยเหลือ / ติดต่อเรา"
              />
            </MenuGroup>

            <ConfirmDialog
              title="ออกจากระบบ"
              description="ต้องการออกจากระบบบัญชีนี้หรือไม่?"
              confirmLabel="ออกจากระบบ"
              tone="destructive"
              onConfirm={handleLogout}
              trigger={
                <Button
                  variant="ghost"
                  className="min-h-11 w-full justify-center gap-2 rounded-2xl text-sm font-semibold text-destructive hover:bg-destructive/10 active:bg-destructive/15"
                >
                  <LogOut className="h-5 w-5" />
                  ออกจากระบบ
                </Button>
              }
            />
          </div>
        )}
      </section>
    </PageShell>
  );
}

function MenuGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="surface-panel overflow-hidden p-1">
      <p className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </p>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function MenuItem({
  to,
  icon,
  label,
  suffix,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  suffix?: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-center justify-between gap-3 rounded-xl px-3 transition-[colors,transform,box-shadow] duration-150 ease-out hover:bg-primary/8 hover:shadow-sm hover:translate-x-0.5 active:bg-primary/15 active:scale-[0.98] active:translate-x-0"
    >
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground transition-colors duration-150 group-hover:text-primary group-active:text-primary">{icon}</span>
        <span className="text-sm font-medium transition-colors duration-150 group-hover:text-primary group-active:text-primary">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {suffix}
        <ChevronRight className="h-4 w-4 text-muted-foreground transition-[transform,color] duration-150 group-hover:translate-x-0.5 group-hover:text-primary group-active:translate-x-0.5 group-active:text-primary" />
      </div>
    </Link>
  );
}

function ThemeRow() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <div className="flex min-h-11 items-center justify-between gap-3 rounded-xl px-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground">
          {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        </span>
        <span className="text-sm font-medium">{isDark ? "โหมดมืด" : "โหมดสว่าง"}</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={toggleTheme}
        aria-label={isDark ? "สลับเป็นโหมดสว่าง" : "สลับเป็นโหมดมืด"}
      />
    </div>
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

/** ยอด TT Points คงเหลือของผู้ใช้ที่ล็อกอินอยู่ */
function PointsSummary() {
  const userId = useAuthUserId();
  const balance = usePointsBalance(userId ?? null);
  return (
    <div className="space-y-2">
      <PointsBalanceCard points={balance.data ?? 0} compact />
      <Link
        to="/points"
        className="block text-center text-xs font-semibold text-primary underline underline-offset-4"
      >
        ดูประวัติแต้ม
      </Link>
    </div>
  );
}
