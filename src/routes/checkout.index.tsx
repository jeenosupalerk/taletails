import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { ChevronLeft, Loader2, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { WonAuctionsPanel } from "@/components/site/WonAuctionsPanel";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { useStartCheckout } from "@/hooks/useStartCheckout";
import { thb, useCart } from "@/lib/cart";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ตะกร้าสินค้า — Taletails";
const description = "ดูรายการการ์ดที่คุณเพิ่มไว้ในตะกร้า และกดดำเนินการชำระเงินได้ทันที";

export const Route = createFileRoute("/checkout/")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/checkout` }],
  }),
  component: CartPage,
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function CartPage() {
  const router = useRouter();
  const { lines, total, remove } = useCart();
  const checkout = useStartCheckout();

  const go = (id: string) => {
    if (!UUID.test(id)) {
      toast.info("รายการนี้เป็นการ์ดตัวอย่าง ยังไม่สามารถชำระเงินได้");
      return;
    }
    checkout.start(id);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-3xl items-center px-2">
          <button
            type="button"
            aria-label="ย้อนกลับ"
            onClick={() =>
              typeof window !== "undefined" && window.history.length > 1
                ? router.history.back()
                : void router.navigate({ to: "/marketplace" })
            }
            className="flex min-h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold">ตะกร้าสินค้า</h1>
          <span className="min-h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {/* ของที่ชนะประมูลและรอชำระเงิน */}
        <WonAuctionsPanel />

        {lines.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
            <Button asChild variant="secondary" className="mt-4 min-h-11 rounded-xl">
              <Link to="/marketplace">ไปเลือกซื้อการ์ด</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="space-y-3">
              {lines.map((line) => (
                <li key={line.id} className="surface-panel p-3">
                  <div className="flex gap-3">
                    <SmartImage
                      src={line.imageUrl}
                      alt={line.name}
                      transformWidth={240}
                      wrapperClassName="h-28 w-20 shrink-0 rounded-xl border border-border"
                      className="object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold break-words">{line.name}</p>
                      <p className="mt-1 font-display text-lg font-bold text-primary">
                        {thb.format(line.price * line.qty)}
                      </p>
                      <p className="text-xs text-muted-foreground">จำนวน {line.qty} ใบ</p>
                    </div>
                    <button
                      type="button"
                      aria-label="ลบออกจากตะกร้า"
                      onClick={() => {
                        remove(line.id);
                        toast.info("นำออกจากตะกร้าแล้ว", { description: line.name });
                      }}
                      className="flex min-h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <Button
                    onClick={() => go(line.id)}
                    disabled={checkout.isPending}
                    className="mt-3 min-h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {checkout.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                    ดำเนินการชำระเงิน
                  </Button>
                </li>
              ))}
            </ul>

            <section className="surface-panel flex items-center justify-between gap-3 p-4">
              <span className="text-sm text-muted-foreground">ยอดรวมในตะกร้า</span>
              <span className="font-display text-xl font-extrabold text-primary">
                {thb.format(total)}
              </span>
            </section>
            <p className="text-center text-[11px] text-muted-foreground">
              การ์ดแต่ละใบเป็นสินค้าชิ้นเดียว ระบบจะล็อกการ์ดไว้ให้คุณเมื่อกดดำเนินการชำระเงิน
            </p>
          </>
        )}
      </main>
    </div>
  );
}
