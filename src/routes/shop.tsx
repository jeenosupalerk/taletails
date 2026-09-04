import { Link, createFileRoute } from "@tanstack/react-router";
import { Loader2, Store } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { CardListingManager } from "@/components/shop/CardListingManager";
import { Button } from "@/components/ui/button";
import { useIsSeller } from "@/hooks/useAdmin";

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
    <PageShell title="ร้านของฉัน" description="ลงสินค้าและเปิดประมูลจากร้านของคุณ">
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
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !isSeller ? (
          <div className="surface-panel mx-auto max-w-md px-6 py-12 text-center">
            <Store className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-3 font-display text-lg font-semibold">ยังไม่ได้รับอนุญาตเปิดร้าน</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              การลงสินค้าและเปิดประมูลสงวนไว้สำหรับบัญชีที่แอดมินอนุญาตแล้วเท่านั้น
              กรุณาติดต่อทีมงานเพื่อขอสิทธิ์ผู้ขาย
            </p>
            <Button asChild variant="secondary" className="mt-5 min-h-11 rounded-xl">
              <Link to="/news">ติดต่อทีมงาน</Link>
            </Button>
          </div>
        ) : (
          <CardListingManager scope="shop" />
        )}
      </section>
    </PageShell>
  );
}
