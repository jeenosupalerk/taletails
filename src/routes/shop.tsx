import { Link, createFileRoute } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Star, Store } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/site/PageShell";
import { CardListingManager } from "@/components/shop/CardListingManager";
import { ListingHistory } from "@/components/shop/ListingHistory";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/site/UserAvatar";
import { ShopOrdersTab, ShopReviewsTab, ShopSettingsTab } from "@/components/shop/ShopTabs";
import { useIsSeller } from "@/hooks/useAdmin";
import { useSellerOrders, useShopProfile, useShopReviews, useShopSummary } from "@/hooks/useShop";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SITE_URL = "https://www.taletails-trade.com";
const title = "ร้านของฉัน | Taletails";
const description =
  "ลงสินค้าการ์ดราคาปกติหรือเปิดรอบประมูล และจัดการสินค้าในร้านของคุณบน Taletails";

export const Route = createFileRoute("/shop")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/shop` }],
  }),
  component: ShopPage,
});

function ShopPage() {
  const { userId, isSeller, isLoading } = useIsSeller();

  return (
    <PageShell title="ร้านของฉัน" description="จัดการสินค้า ประมูล และประวัติการขายของร้านคุณ">
      <section className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8">
        {!userId ? (
          <div className="surface-panel flex flex-col items-center gap-4 px-6 py-14 text-center">
            <Store className="min-h-10 w-10 text-primary" />
            <div>
              <p className="font-semibold">ยังไม่ได้เข้าสู่ระบบ</p>
              <p className="text-sm text-muted-foreground">
                เข้าสู่ระบบด้วยบัญชีที่ได้รับอนุญาตให้เปิดร้าน
              </p>
            </div>
            <Button
              asChild
              className="min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground"
            >
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : isLoading ? (
          <div className="grid place-items-center py-24">
            <LogoLoader size={64} />
          </div>
        ) : !isSeller ? (
          <div className="surface-panel mx-auto max-w-md px-6 py-12 text-center">
            <Store className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-semibold">ยังไม่ได้รับอนุญาตเปิดร้าน</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              การลงสินค้าและเปิดประมูลสงวนไว้สำหรับบัญชีที่แอดมินอนุญาตแล้วเท่านั้น
              กรุณาติดต่อทีมงานเพื่อขอสิทธิ์ผู้ขาย
            </p>
          </div>
        ) : (
          <SellerHub userId={userId} />
        )}
      </section>
    </PageShell>
  );
}

const TABS = [
  { key: "items", label: "สินค้า" },
  { key: "orders", label: "คำสั่งซื้อ" },
  { key: "reviews", label: "รีวิว" },
  { key: "settings", label: "ตั้งค่าร้าน" },
  { key: "history", label: "ประวัติ" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/** หน้าร้านผู้ขาย: หัวร้าน (ชื่อ + คะแนน + ยอดขาย) → แท็บ สินค้า / คำสั่งซื้อ / รีวิว / ตั้งค่าร้าน / ประวัติ */
function SellerHub({ userId }: { userId: string }) {
  const { user } = useAuth();
  const [tab, setTab] = useState<TabKey>("items");
  const profile = useShopProfile(userId);
  const summary = useShopSummary(userId);
  const orders = useSellerOrders(userId);
  const fallbackName = user?.name || "ร้านของฉัน";
  const shopName = profile.data?.shop_name || fallbackName;
  const s = summary.data;
  const toShip = (orders.data ?? []).filter((o) => o.status === "paid").length;
  const reviews = useShopReviews(userId);
  const unreplied = (reviews.data ?? []).filter((r) => !r.seller_reply).length;

  return (
    <div className="space-y-6">
      <div className="flex min-w-0 items-center gap-4">
        <UserAvatar name={shopName} src={user?.avatarUrl} className="h-16 w-16" />
        <div className="min-w-0">
          <h2 className="truncate font-display text-2xl font-semibold">{shopName}</h2>
          <p className="flex flex-wrap items-center gap-x-3 text-sm text-muted-foreground">
            {s && s.review_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
                <b className="text-foreground">{s.avg_rating?.toFixed(1)}</b> ({s.review_count}{" "}
                รีวิว)
              </span>
            ) : (
              <span>ยังไม่มีรีวิว</span>
            )}
            {s && <span>ขายแล้ว {s.sold_count} ชิ้น</span>}
          </p>
        </div>
      </div>

      <div
        role="tablist"
        aria-label="ส่วนของร้าน"
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-1.5 border-b-2 px-4 text-sm font-semibold transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
            {t.key === "orders" && toShip > 0 && (
              <span className="rounded-full bg-emerald-500/15 px-2 text-[11px] text-emerald-700 dark:text-emerald-400">
                {toShip}
              </span>
            )}
            {t.key === "reviews" && unreplied > 0 && (
              <span className="rounded-full bg-primary/15 px-2 text-[11px] text-primary">
                {unreplied}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === "items" && <CardListingManager scope="shop" />}
      {tab === "orders" && <ShopOrdersTab sellerId={userId} />}
      {tab === "reviews" && <ShopReviewsTab sellerId={userId} />}
      {tab === "settings" && <ShopSettingsTab userId={userId} fallbackName={fallbackName} />}
      {tab === "history" && <ListingHistory />}
    </div>
  );
}
