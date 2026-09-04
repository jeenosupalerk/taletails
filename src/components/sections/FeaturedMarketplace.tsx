import { Link } from "@tanstack/react-router";
import { BadgeCheck, Heart } from "lucide-react";
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
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
          {product.soldCount > 0 && (
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

export function FeaturedMarketplace({ showHeading = true }: { showHeading?: boolean }) {
  const { data: liveCards } = useMarketplaceCards();
  // Live Supabase rows when available, curated demo listings otherwise.
  const featured = liveCards && liveCards.length > 0 ? liveCards : getFeaturedProducts();

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
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {featured.map((product) => (
            <ProductGridCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
