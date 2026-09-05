import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ChevronRight, Heart, Loader2, ShoppingBag, Star } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ProductGridCard } from "@/components/sections/FeaturedMarketplace";
import { PageShell } from "@/components/site/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getProductById, getRelatedProducts, type Product } from "@/data/products";
import { useBuyNow } from "@/hooks/useCardDetail";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useLiveProduct, useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { thb, useCart } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => getProductById(params.id) ?? null,
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.cardName} — ตลาดซื้อขาย Taletails`
      : "รายละเอียดการ์ด — Taletails";
    const description = loaderData
      ? `${loaderData.cardName} ชุด ${loaderData.setName} เกรด ${loaderData.grade} ราคา ${loaderData.price.toLocaleString("th-TH")} บาท จากร้าน ${loaderData.storeName}`
      : "รายละเอียดการ์ดสะสมบน Taletails ดูสภาพ เกรด ใบรับรอง และราคาขายจริง";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/product` }],
    };
  },
  component: ProductPage,
});

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold break-words">{value}</span>
    </div>
  );
}

function Stars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= Math.round(rating) ? "fill-primary text-primary" : "text-muted-foreground/40"}`}
        />
      ))}
    </span>
  );
}

function ProductPage() {
  const { id } = Route.useParams();
  const demo = Route.useLoaderData() as Product | null;

  const liveQuery = useLiveProduct(id, !demo);
  const live = liveQuery.data ?? null;
  const product = demo ?? live?.product ?? null;
  const isLive = !demo && Boolean(live);

  const { data: liveCards } = useMarketplaceCards();
  const related = demo
    ? getRelatedProducts(demo.id)
    : (liveCards ?? []).filter((c) => c.id !== id).slice(0, 4);

  const { add } = useCart();
  const requireAuth = useRequireAuth();
  const navigate = useNavigate();
  const buyNow = useBuyNow();
  const watchlist = useWatchlist();
  const [active, setActive] = useState(0);

  if (!demo && liveQuery.isLoading) {
    return (
      <PageShell eyebrow="ตลาดซื้อขาย" title="กำลังโหลดรายละเอียด" description="โปรดรอสักครู่">
        <div className="flex h-56 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </PageShell>
    );
  }

  if (!product) {
    return (
      <PageShell
        eyebrow="ตลาดซื้อขาย"
        title="ไม่พบการ์ดใบนี้"
        description="การ์ดอาจถูกขายหรือปิดการขายไปแล้ว"
      >
        <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
          <Link
            to="/marketplace"
            className="inline-flex min-h-10 items-center rounded-full border border-border px-5 text-sm font-medium"
          >
            กลับไปตลาดซื้อขาย
          </Link>
        </div>
      </PageShell>
    );
  }

  const wished = watchlist.has(product.id);
  const soldOut = isLive && live?.status !== "available";

  const addToCart = () => {
    if (!requireAuth("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")) return false;
    add({
      id: product.id,
      name: product.cardName,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    toast.success("เพิ่มลงตะกร้าแล้ว", { description: product.cardName });
    return true;
  };

  const goToExistingOrder = async () => {
    // ถ้าผู้ใช้เคยกดจองการ์ดใบนี้ไว้แล้ว ให้พาไปชำระเงินรายการเดิมแทนที่จะเงียบหาย
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user.id;
    if (!uid) return false;
    const { data: existing } = await supabase
      .from("orders")
      .select("id")
      .eq("card_id", product.id)
      .eq("user_id", uid)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existing) return false;
    toast.info("คุณมีคำสั่งซื้อที่รอชำระสำหรับการ์ดใบนี้อยู่แล้ว");
    void navigate({ to: "/checkout/$id", params: { id: existing.id } });
    return true;
  };

  const buyLive = () => {
    if (!requireAuth("กรุณาเข้าสู่ระบบก่อนสั่งซื้อ")) return;
    buyNow.mutate(product.id, {
      onSuccess: (order) => {
        toast.success("จองการ์ดสำเร็จ กำลังไปหน้าชำระเงิน");
        void navigate({ to: "/checkout/$id", params: { id: order.id } });
      },
      onError: (e) => {
        void goToExistingOrder().then((handled) => {
          if (!handled) toast.error(e.message);
        });
      },
    });
  };

  return (
    <PageShell
      eyebrow="ตลาดซื้อขาย"
      title={product.cardName}
      description={`${product.setName} • ${product.grade}`}
    >
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-44 sm:px-6 lg:px-8 lg:pb-32">
        {/* แกลเลอรี */}
        <div className="surface-panel overflow-hidden p-4">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
            <SmartImage
              src={product.images[active] ?? product.imageUrl}
              alt={`${product.cardName} รูปที่ ${active + 1}`}
              transformWidth={900}
              priority
              className="object-cover object-center"
            />
          </div>
          {product.images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {product.images.map((img, i) => (
                <button
                  key={img}
                  type="button"
                  onClick={() => setActive(i)}
                  aria-label={`ดูรูปที่ ${i + 1}`}
                  className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-secondary/40 transition-colors ${
                    i === active ? "border-primary" : "border-border"
                  }`}
                >
                  <SmartImage src={img} alt="" transformWidth={160} className="object-cover object-center" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ชื่อ + ราคา */}
        <div className="mt-6">
          <h2 className="font-display text-xl font-bold break-words sm:text-2xl">
            {product.cardName}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>ขายไปแล้ว {product.soldCount} ชิ้น</span>
            {product.isVerified && (
              <span className="inline-flex items-center gap-1 text-accent">
                <BadgeCheck className="h-4 w-4" />
                ตรวจสอบแล้ว
              </span>
            )}
          </div>
          {product.reviews.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-sm">
              <Stars rating={product.rating} />
              <span className="font-semibold">{product.rating.toFixed(1)}</span>
              <span className="text-muted-foreground underline">
                ({product.reviews.length} รีวิว)
              </span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
            <div className="px-3 py-3">
              <p className="text-xs text-muted-foreground">ราคาขาย</p>
              <p className="mt-1 font-display text-lg font-bold">{thb.format(product.price)}</p>
            </div>
            <div className="px-3 py-3">
              <p className="text-xs text-muted-foreground">เสนอสูงสุด</p>
              <p className="mt-1 font-display text-lg font-bold">
                {product.highestBid ? thb.format(product.highestBid) : "—"}
              </p>
            </div>
            <div className="px-3 py-3">
              <p className="text-xs text-muted-foreground">ขายไปแล้ว</p>
              <p className="mt-1 font-display text-lg font-bold">{product.soldCount} ชิ้น</p>
            </div>
          </div>
        </div>

        {/* รายละเอียดการ์ด */}
        <section className="surface-panel mt-6 p-4">
          <h3 className="font-display text-base font-bold">รายละเอียดการ์ด</h3>
          <div className="mt-2">
            <SpecRow label="ชื่อการ์ด" value={product.cardName} />
            <SpecRow label="Set" value={product.setName} />
            <SpecRow label="Card No." value={product.cardNo} />
            <SpecRow label="ภาษา" value={product.language} />
            <SpecRow label="Rarity" value={product.rarity} />
            <SpecRow label="ปี" value={String(product.year)} />
            <SpecRow label="Grade" value={product.grade} />
            <SpecRow label="Grading Company" value={product.gradingCompany} />
            <SpecRow label="Certification No." value={product.certificationNo} />
            <SpecRow label="สภาพ/ตำหนิ" value={product.conditionNote} />
          </div>
          {product.sellerNote && (
            <div className="mt-3 rounded-xl bg-secondary/50 p-3">
              <p className="text-xs font-semibold text-muted-foreground">รายละเอียดจากผู้ขาย</p>
              <p className="mt-1 text-sm break-words">{product.sellerNote}</p>
            </div>
          )}
        </section>

        {/* รีวิว */}
        {product.reviews.length > 0 && (
          <section className="surface-panel mt-6 p-4">
            <div className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3">
              <div>
                <p className="font-display text-2xl font-bold">{product.rating.toFixed(1)}</p>
                <p className="text-xs text-muted-foreground">จาก 5 คะแนน</p>
              </div>
              <div className="text-right">
                <Stars rating={product.rating} />
                <p className="mt-1 text-xs text-muted-foreground underline">
                  {product.reviews.length} รีวิว
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-4">
              {product.reviews.map((review) => (
                <li key={review.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Stars rating={review.rating} />
                    <span className="text-xs text-muted-foreground">{review.timeAgo}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{review.condition}</p>
                  <p className="mt-1 text-sm">{review.comment}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ข้อมูลเพิ่มเติม */}
        <Accordion type="multiple" className="surface-panel mt-6 px-4 py-2">
          <AccordionItem value="authenticity">
            <AccordionTrigger className="py-5 text-sm font-semibold">การตรวจสอบของแท้</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              ทุกใบผ่านการตรวจสอบโดยทีม Taletails และยืนยันรหัสจาก {product.gradingCompany} ก่อนส่งถึงมือผู้ซื้อ
              รหัสรายการ: {product.cardIdCode}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger className="py-5 text-sm font-semibold">การจัดส่งและการคืนสินค้า</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              จัดส่งภายใน 1–2 วันทำการ พร้อมกล่องกันกระแทกและประกันการขนส่งเต็มมูลค่า
              คืนสินค้าได้ภายใน 7 วันหากสภาพไม่ตรงตามที่ระบุ
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sales">
            <AccordionTrigger className="py-5 text-sm font-semibold">ประวัติการขาย</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              ขายไปแล้ว {product.soldCount} ชิ้น ราคาขายปัจจุบัน {thb.format(product.price)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* สินค้าที่คุณอาจจะชอบ */}
        {related.length > 0 && (
          <section className="mt-10">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">สินค้าที่คุณอาจจะชอบ</h3>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
              {related.map((item) => (
                <ProductGridCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* แถบซื้อด้านล่าง — บนมือถือยกขึ้นเหนือเมนูล่าง (MobileBottomNav) */}
      <div className="fixed inset-x-0 bottom-[calc(88px+max(1rem,env(safe-area-inset-bottom)))] z-40 px-4 lg:bottom-0 lg:border-t lg:border-border lg:bg-background/95 lg:px-0 lg:backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 rounded-2xl border border-border/70 bg-card/95 px-4 py-3 shadow-glow backdrop-blur sm:px-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:py-3 lg:shadow-none lg:backdrop-blur-none">
          <button
            type="button"
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
            className="flex min-h-11 shrink-0 flex-col items-center justify-center px-2 text-[10px] text-muted-foreground"
            aria-label="เพิ่มลงรายการที่อยากได้"
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} />
            อยากได้
          </button>
          <Button
            variant="secondary"
            onClick={addToCart}
            disabled={soldOut}
            className="min-h-11 flex-1 rounded-xl font-semibold"
          >
            <ShoppingBag className="h-4 w-4" />
            เพิ่มลงตะกร้า
          </Button>
          {isLive ? (
            <ConfirmDialog
              title="ยืนยันการซื้อการ์ด"
              description={`ยืนยันซื้อ "${product.cardName}" ราคา ${thb.format(product.price)} ระบบจะล็อกการ์ดใบนี้ไว้ให้คุณและพาไปหน้าชำระเงิน`}
              confirmLabel="ซื้อเลย"
              disabled={buyNow.isPending || soldOut}
              onConfirm={buyLive}
              trigger={
                <Button
                  disabled={buyNow.isPending || soldOut}
                  className="min-h-11 flex-1 rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
                >
                  {buyNow.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {soldOut ? "ไม่พร้อมขาย" : "ซื้อเลย"}
                </Button>
              }
            />
          ) : (
            <Button
              onClick={() => {
                if (!addToCart()) return;
                navigate({ to: "/checkout" });
              }}
              className="min-h-11 flex-1 rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
            >
              ซื้อเลย
            </Button>
          )}
        </div>
      </div>
    </PageShell>
  );
}
