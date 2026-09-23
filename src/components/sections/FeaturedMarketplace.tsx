import { Link } from "@tanstack/react-router";
import { ArrowDownWideNarrow, BadgeCheck, ChevronDown, Heart, Images } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SectionHeading } from "@/components/site/SectionHeading";
import { getFeaturedProducts, type Product } from "@/data/products";
import { useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { SmartImage } from "@/components/ui/smart-image";
import { GradeBadge, MarketDiffChip } from "@/components/card/CardBits";
import { useMarketPriceIndex } from "@/hooks/useMarketStats";
import { diffVsMarket } from "@/lib/market-price";

export function ProductGridCard({ product }: { product: Product }) {
  const watchlist = useWatchlist();
  const wished = watchlist.has(product.id);
  const { lookup } = useMarketPriceIndex();
  const isSold = product.status === "sold";
  const isPending = product.status === "locked";
  const stock = product.stockQuantity ?? null;
  const lowStock = !isSold && stock !== null && stock > 0 && stock <= 3;
  const photoCount = product.images?.length ?? 0;

  // เทียบราคาที่ตั้งขายกับราคาตลาดของ "การ์ดรุ่นเดียวกัน" (ชื่อ + ชุด + เกรด)
  const market = lookup({
    name: product.cardName,
    set: product.setName,
    grade: product.grade,
    company: product.gradingCompany,
    condition: product.conditionNote,
  });
  const diff = isSold ? null : diffVsMarket(product.price, market?.marketPrice);

  const toggleWish = () => {
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
  };

  return (
    <article className="group relative flex flex-col rounded-[18px] bg-card p-2 shadow-[0_1px_2px_oklch(0.3_0.03_55/0.06)] ring-1 ring-border/70 transition-shadow duration-200 hover:shadow-card">
      <Link
        to="/product/$id"
        params={{ id: product.id }}
        className="flex flex-col rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={product.cardName}
      >
        {/* ช่องรูป 5:7 เท่าการ์ดจริง — รูปที่ครอบตอนลงสินค้าจะพอดีช่องเต็มใบ */}
        <div className="relative aspect-[5/7] overflow-hidden rounded-xl bg-tile transition-transform duration-200 group-active:scale-[0.98]">
          <SmartImage
            src={product.imageUrl}
            alt={`${product.cardName} ${product.setName}`}
            transformWidth={600}
            className={`object-cover ${isSold ? "opacity-45 grayscale-[40%]" : ""}`}
          />

          {(isSold || isPending) && (
            <span
              className={`absolute top-2 left-2 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ${
                isSold ? "bg-foreground/85 text-background" : "bg-amber-500 text-white"
              }`}
            >
              {isSold ? "ขายแล้ว" : "รอชำระเงิน"}
            </span>
          )}

          {/* บอกว่ามีหลายรูปตั้งแต่หน้าตลาด ไม่ต้องกดเข้าไปถึงจะรู้ */}
          {photoCount > 1 && (
            <span className="absolute bottom-2 left-2 inline-flex h-[22px] items-center gap-1 rounded-full bg-foreground/70 px-2 text-[11px] font-semibold text-background backdrop-blur-sm">
              <Images className="h-3 w-3" />
              {photoCount} รูป
            </span>
          )}

          <GradeBadge grade={product.grade} company={product.gradingCompany} condition={product.conditionNote} />
        </div>

        <div className="flex flex-col px-1.5 pt-2.5 pb-1">
          <p className="flex min-h-4 items-center gap-1 text-xs text-muted-foreground">
            <span className="truncate">{product.setName !== "-" ? product.setName : " "}</span>
            {product.isVerified && (
              <BadgeCheck className="h-3.5 w-3.5 shrink-0 text-accent" aria-label="ตรวจสอบแล้ว" />
            )}
          </p>
          <h3 className="mt-0.5 line-clamp-2 min-h-10 text-[15px] leading-snug font-semibold break-words text-foreground sm:text-base">
            {product.cardName}
          </h3>
          <div className="mt-1.5 flex items-center justify-between gap-1.5">
            <p className={`truncate font-display text-base font-bold sm:text-lg ${isSold ? "text-muted-foreground" : ""}`}>
              {thb.format(product.price)}
            </p>
            <MarketDiffChip diff={diff} />
          </div>
          {/* บรรทัดสต็อก/ยอดขาย — เว้นความสูงไว้เสมอให้การ์ดทุกใบเรียงตรงกัน */}
          <p className="mt-0.5 flex h-4 items-center gap-1 truncate text-[11px] text-muted-foreground">
            {lowStock && <span className="font-semibold text-primary">เหลือ {stock} ชิ้น</span>}
            {lowStock && product.soldCount > 0 && <span aria-hidden>·</span>}
            {product.soldCount > 0 && <span>ขายแล้ว {product.soldCount}</span>}
          </p>
        </div>
      </Link>

      {/* ปุ่มหัวใจลอยมุมรูป แยกจากลิงก์ กดแล้วไม่เปิดหน้าสินค้า */}
      <button
        type="button"
        aria-label={wished ? "นำออกจากรายการที่อยากได้" : "เพิ่มลงรายการที่อยากได้"}
        aria-pressed={wished}
        onClick={toggleWish}
        className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 shadow-sm ring-1 ring-border/60 backdrop-blur transition-transform duration-150 hover:text-primary active:scale-90"
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
        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {items.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
