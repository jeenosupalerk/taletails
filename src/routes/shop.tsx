import { Link, createFileRoute } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Store } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/site/PageShell";
import { CardListingManager } from "@/components/shop/CardListingManager";
import { ListingHistory } from "@/components/shop/ListingHistory";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/site/UserAvatar";
import { useIsSeller } from "@/hooks/useAdmin";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
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
          <SellerHub />
        )}
      </section>
    </PageShell>
  );
}

const TABS = [
  { key: "items", label: "สินค้า" },
  { key: "history", label: "ประวัติการลงขาย" },
] as const;

/**
 * หน้าร้านผู้ขาย — หัวร้าน + แท็บ
 * เตรียมไว้สำหรับรอบถัดไป: แท็บคำสั่งซื้อ / รีวิว / ตั้งค่าร้าน (ต้องมีตารางใน Supabase ก่อน)
 */
function SellerHub() {
  const { user } = useAuth();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("items");
  const shopName = user?.name || "ร้านของฉัน";

  const header = (
    <div className="flex min-w-0 items-center gap-3">
      <UserAvatar name={shopName} src={user?.avatarUrl} className="h-14 w-14" />
      <div className="min-w-0">
        <h2 className="truncate font-display text-xl font-semibold">{shopName}</h2>
        <p className="text-sm text-muted-foreground">ร้านค้าบน Taletails</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="ส่วนของร้าน" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold transition-colors",
              tab === t.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "items" ? <CardListingManager scope="shop" header={header} /> : <ListingHistory />}
    </div>
  );
}
