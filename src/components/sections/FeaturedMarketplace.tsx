import { Link } from "@tanstack/react-router";
import { BadgeCheck, Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/site/SectionHeading";
import { getFeaturedProducts, type Product } from "@/data/products";
import { useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { SmartImage } from "@/components/ui/smart-image";


export function ProductGridCard({ product }: { product: Product }) {
  const watchlist = useWatchlist();
  const wished = watchlist.has(product.id);
  const isSold = product.status === "sold";
  const isPending = product.status === "locked";

  return (
    <article className="group surface-panel relative flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="flex flex-1 flex-col"
        aria-label={product.cardName}
      >

        <div className="relative aspect-[3/4] overflow-hidden rounded-t-2xl border-b border-border bg-secondary/40">
          <SmartImage
            src={product.imageUrl}
            alt={`${product.cardName} — ${product.setName}`}
            transformWidth={600}
            className={`object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
              isSold ? "opacity-50" : ""
            }`}
          />
          {isSold && (
            <span className="absolute inset-x-0 top-1/2 mx-auto w-fit -translate-y-1/2 rounded-full bg-foreground/85 px-4 py-1.5 text-xs font-bold tracking-wide text-background shadow-lg">
              ขายแล้ว (Sold Out)
            </span>
          )}
          {isPending && (
            <span className="absolute top-2 left-2 rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold text-white shadow-sm">
              กำลังรอการชำระเงิน
            </span>
          )}
          {!isSold && product.soldCount > 0 && (
            <span className="absolute top-2 right-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-primary shadow-sm backdrop-blur">
              ขายแล้ว {product.soldCount}
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col px-3 pt-1 pb-3">
          <p className="flex items-start gap-1 text-sm font-semibold">
            <span className="line-clamp-2 break-words">{product.cardName}</span>
            {product.isVerified && <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />}
          </p>

          <div className="mt-auto pt-4 pr-12">
            <p className="font-display text-base font-bold">{thb.format(product.price)}</p>
          </div>
        </div>
      </Link>

      <button
        type="button"
        aria-label="เพิ่มลงรายการที่อยากได้"
        onClick={() => {
          const added = watchlist.toggle({
            id: product.id,
            name: product.cardName,
            subtitle: product.setName,
            imageUrl: product.imageUrl,
            price: product.price,
            kind: "product",
          });
          toast[added ? "success" : "info"](
            added ? "เพิ่มลงรายการที่อยากได้แล้ว" : "นำออกจากรายการที่อยากได้แล้ว",
            { description: product.cardName },
          );
        }}
        className="absolute right-3 bottom-3 flex min-h-10 w-10 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-colors hover:bg-secondary"
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-primary text-primary" : "text-muted-foreground"}`} />
      </button>
    </article>
  );
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "available", label: "พร้อมขาย" },
  { value: "locked", label: "รอชำระเงิน" },
  { value: "sold", label: "ขายแล้ว" },
];

const STATUS_RANK: Record<string, number> = { available: 0, locked: 1, sold: 2 };

export function FeaturedMarketplace({
  showHeading = true,
  showFilter = false,
}: {
  showHeading?: boolean;
  showFilter?: boolean;
}) {
  const { data: liveCards } = useMarketplaceCards();
  const [filter, setFilter] = useState("all");
  // Live Supabase rows when available, curated demo listings otherwise.
  const all = liveCards && liveCards.length > 0 ? liveCards : getFeaturedProducts();
  const sorted = [...all].sort(
    (a, b) => (STATUS_RANK[a.status ?? "available"] ?? 0) - (STATUS_RANK[b.status ?? "available"] ?? 0),
  );
  const featured = showFilter && filter !== "all"
    ? sorted.filter((p) => (p.status ?? "available") === filter)
    : sorted;

  return (
    <section id="marketplace" className="border-y border-border bg-card/30">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {showHeading && (
          <SectionHeading
            eyebrow="รายการแนะนำ"
            title="ตลาดซื้อขาย"
            description="ซื้อได้ทันทีจากร้านที่ยืนยันตัวตนแล้ว ทุกใบมีรหัสการ์ดตรวจสอบย้อนหลังได้"
            actionLabel="ดูทั้งหมด"
            actionTo="/marketplace"
          />
        )}
        {!showHeading && <h2 className="sr-only">การ์ดที่วางขายในตลาด</h2>}
        {showFilter && (
          <div className="mb-6 flex flex-wrap gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors ${
                  filter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
        {featured.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            ยังไม่มีสินค้าในสถานะนี้
          </p>
        )}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
