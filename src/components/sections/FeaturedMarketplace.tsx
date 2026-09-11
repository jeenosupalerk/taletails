import { Link } from "@tanstack/react-router";
import { ArrowDownWideNarrow, BadgeCheck, ChevronDown, Heart } from "lucide-react";
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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-white border-2 border-transparent shadow-sm transition-[box-shadow,border-color] duration-200 hover:shadow-card active:border-primary active:shadow-glow dark:bg-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="flex flex-col transition-transform duration-200 active:scale-[0.98]"
        aria-label={product.cardName}
      >
        <div className="relative aspect-square border-b border-border bg-secondary/40 p-3 sm:p-4">
          <SmartImage
            src={product.imageUrl}
            alt={`${product.cardName} — ${product.setName}`}
            transformWidth={600}
            className={`h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105 ${
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
        </div>

        <div className="flex h-28 flex-col gap-0.5 px-3.5 pt-3 pb-2">
          <p className="flex items-center gap-1 text-sm font-bold">
            <span className="truncate">{product.setName}</span>
            {product.isVerified && <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" />}
          </p>
          <p className="line-clamp-2 min-h-10 text-[13px] leading-snug break-words text-muted-foreground">
            {product.cardName}
          </p>
          <p className="min-h-[16px] text-[11px] font-medium text-primary">
            {!isSold && product.soldCount > 0 ? `ขายแล้ว ${product.soldCount} ใบ` : ""}
          </p>
        </div>
      </Link>

      <div className="flex min-h-14 items-end justify-between gap-2 px-3.5 pb-3.5">
        <div className="min-w-0">
          <p className="text-[11px] text-muted-foreground">ราคาเริ่มต้น</p>
          <p className="truncate font-display text-base font-bold">{thb.format(product.price)}</p>
        </div>
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
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm transition-[colors,transform,border-color] duration-150 hover:border-primary/40 hover:text-primary active:scale-90 active:border-primary"
        >
          <Heart className={`h-4 w-4 ${wished ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      </div>
    </article>
  );
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "available", label: "พร้อมขาย" },
  { value: "locked", label: "รอชำระเงิน" },
  { value: "sold", label: "ขายแล้ว" },
];

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "featured", label: "แนะนำ" },
  { value: "price-asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price-desc", label: "ราคา: สูง → ต่ำ" },
  { value: "best-selling", label: "ขายดีที่สุด" },
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
  const [sort, setSort] = useState("featured");
  // Live Supabase rows when available, curated demo listings otherwise.
  const all = liveCards && liveCards.length > 0 ? liveCards : getFeaturedProducts();

  let items = [...all].sort(
    (a, b) => (STATUS_RANK[a.status ?? "available"] ?? 0) - (STATUS_RANK[b.status ?? "available"] ?? 0),
  );
  if (showFilter && filter !== "all") {
    items = items.filter((p) => (p.status ?? "available") === filter);
  }
  if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
  else if (sort === "best-selling") items.sort((a, b) => b.soldCount - a.soldCount);

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
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                aria-pressed={filter === f.value}
                className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition-[colors,transform,box-shadow] duration-150 active:scale-95 ${
                  filter === f.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:text-foreground active:border-primary active:text-primary"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="relative ml-auto">
              <ArrowDownWideNarrow className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                aria-label="เรียงลำดับสินค้า"
                className="h-10 cursor-pointer appearance-none rounded-full border border-border bg-card pr-9 pl-9 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>
        )}
        {items.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            ยังไม่มีสินค้าในสถานะนี้
          </p>
        )}
        <div className="grid grid-cols-2 items-start gap-4 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
          {items.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
