import { Link, createFileRoute } from "@tanstack/react-router";
import { Heart, X } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "รายการโปรดของฉัน | Taletails";
const description =
  "รวมการ์ดสะสมที่คุณกดถูกใจไว้ ติดตามราคาและกลับมาประมูลหรือซื้อได้ทันทีบน Taletails";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/wishlist` }],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { items, count, remove } = useWatchlist();

  return (
    <PageShell
      eyebrow="Wishlist"
      title="รายการโปรด"
      description="การ์ดที่คุณติดตามไว้ทั้งหมดอยู่ที่นี่"
    >
      <section className="mx-auto max-w-7xl px-4 py-10 pb-28 sm:px-6 lg:px-8">
        {count === 0 ? (
          <div className="surface-panel flex flex-col items-center gap-3 px-6 py-14 text-center">
            <Heart className="h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">
              ยังไม่มีรายการโปรด กดรูปหัวใจบนการ์ดที่สนใจเพื่อบันทึกไว้
            </p>
            <Button asChild className="min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground">
              <Link to="/marketplace">ไปที่ตลาดซื้อขาย</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((item) => (
              <li key={item.id} className="surface-panel relative overflow-hidden">
                <ConfirmDialog
                  title="ลบออกจากรายการโปรด"
                  description={`ต้องการลบ "${item.name}" ออกจากรายการโปรดหรือไม่?`}
                  confirmLabel="ลบ"
                  tone="destructive"
                  onConfirm={() => remove(item.id)}
                  trigger={
                    <button
                      type="button"
                      aria-label={`ลบ ${item.name} ออกจากรายการโปรด`}
                      className="absolute top-2 right-2 z-10 grid h-8 w-8 place-items-center rounded-full bg-card shadow-card"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  }
                />
                <Link
                  to={item.kind === "auction" ? "/auctions" : "/product/$id"}
                  {...(item.kind === "auction" ? {} : { params: { id: item.id } })}
                  className="block"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="aspect-[3/4] w-full object-cover"
                  />
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    <p className="mt-1 text-sm font-bold text-primary">{thb.format(item.price)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
