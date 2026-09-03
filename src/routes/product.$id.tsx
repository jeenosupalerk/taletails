import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ChevronRight, Heart, ShoppingBag, Star } from "lucide-react";
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
import { getProductById, getRelatedProducts, type Product } from "@/data/products";
import { thb, useCart } from "@/lib/cart";

const SITE_URL = "https://taletails-test.lovable.app";

export const Route = createFileRoute("/product/$id")({
  loader: ({ params }) => {
    const product = getProductById(params.id);
    if (!product) throw notFound();
    return product;
  },
  head: ({ loaderData }) => {
    const title = loaderData
      ? `${loaderData.cardName} — ตลาดซื้อขาย Taletails`
      : "รายละเอียดการ์ด — Taletails";
    const description = loaderData
      ? `${loaderData.cardName} ชุด ${loaderData.setName} เกรด ${loaderData.grade} ราคา ${loaderData.price.toLocaleString("th-TH")} บาท จากร้าน ${loaderData.storeName}`
      : "รายละเอียดการ์ดสะสมบน Taletails";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "product" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  component: ProductPage,
});

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/70 py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{value}</span>
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
  const product = Route.useLoaderData() as Product;
  const related = getRelatedProducts(product.id);
  const { add } = useCart();
  const navigate = useNavigate();
  const [active, setActive] = useState(0);
  const [wished, setWished] = useState(false);

  const addToCart = () => {
    add({
      id: product.id,
      name: product.cardName,
      price: product.price,
      imageUrl: product.imageUrl,
    });
    toast.success("เพิ่มลงตะกร้าแล้ว", { description: product.cardName });
  };

  return (
    <PageShell
      eyebrow={product.storeName}
      title={product.cardName}
      description={`${product.setName} • ${product.grade}`}
    >
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-44 sm:px-6 lg:px-8 lg:pb-32">
        {/* แกลเลอรี */}
        <div className="surface-panel overflow-hidden p-4">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-border bg-secondary/40">
            <img
              src={product.images[active] ?? product.imageUrl}
              alt={`${product.cardName} รูปที่ ${active + 1}`}
              className="h-full w-full object-cover object-center"
            />
          </div>
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
                <img src={img} alt="" className="h-full w-full object-cover object-center" />
              </button>
            ))}
          </div>
        </div>

        {/* ชื่อ + ราคา */}
        <div className="mt-6">
          <h2 className="font-display text-xl font-bold sm:text-2xl">{product.cardName}</h2>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            {product.storeName}
            {product.isVerified && <BadgeCheck className="h-4 w-4 text-accent" />}
          </p>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <Stars rating={product.rating} />
            <span className="font-semibold">{product.rating.toFixed(1)}</span>
            <span className="text-muted-foreground underline">
              ({product.reviews.length} รีวิว)
            </span>
          </div>

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
              <p className="text-xs text-muted-foreground">ขายล่าสุด</p>
              <p className="mt-1 font-display text-lg font-bold">
                {thb.format(product.lastSalePrice)}
              </p>
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
          <div className="mt-3 rounded-xl bg-secondary/50 p-3">
            <p className="text-xs font-semibold text-muted-foreground">รายละเอียดจากผู้ขาย</p>
            <p className="mt-1 text-sm">{product.sellerNote}</p>
          </div>
        </section>

        {/* รีวิว */}
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

        {/* ข้อมูลเพิ่มเติม */}
        <Accordion type="multiple" className="surface-panel mt-6 px-4">
          <AccordionItem value="authenticity">
            <AccordionTrigger className="text-sm font-semibold">การตรวจสอบของแท้</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              ทุกใบผ่านการตรวจสอบโดยทีม Taletails และยืนยันรหัสจาก {product.gradingCompany} ก่อนส่งถึงมือผู้ซื้อ
              รหัสรายการ: {product.cardIdCode}
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="shipping">
            <AccordionTrigger className="text-sm font-semibold">การจัดส่งและการคืนสินค้า</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              จัดส่งภายใน 1–2 วันทำการ พร้อมกล่องกันกระแทกและประกันการขนส่งเต็มมูลค่า
              คืนสินค้าได้ภายใน 7 วันหากสภาพไม่ตรงตามที่ระบุ
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="sales">
            <AccordionTrigger className="text-sm font-semibold">ประวัติการขายล่าสุด</AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground">
              ขายไปแล้ว {product.soldCount} รายการ ราคาขายล่าสุด {thb.format(product.lastSalePrice)}
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* สินค้าที่คุณอาจจะชอบ */}
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
      </div>

      {/* แถบซื้อด้านล่าง — บนมือถือยกขึ้นเหนือเมนูล่าง (MobileBottomNav) */}
      <div className="fixed inset-x-0 bottom-[calc(64px+max(0.75rem,env(safe-area-inset-bottom)))] z-40 px-4 lg:bottom-0 lg:border-t lg:border-border lg:bg-background/95 lg:px-0 lg:backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 rounded-2xl border border-border/70 bg-card/95 px-3 py-2.5 shadow-glow backdrop-blur sm:px-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:py-3 lg:shadow-none lg:backdrop-blur-none">
          <button
            type="button"
            onClick={() => {
              setWished((v) => !v);
              if (!wished) toast.success("เพิ่มลงรายการที่อยากได้แล้ว");
            }}
            className="flex h-11 shrink-0 flex-col items-center justify-center px-1 text-[10px] text-muted-foreground"
            aria-label="เพิ่มลงรายการที่อยากได้"
          >
            <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : ""}`} />
            อยากได้
          </button>
          <Button
            variant="secondary"
            onClick={addToCart}
            className="h-11 flex-1 rounded-xl font-semibold"
          >
            <ShoppingBag className="h-4 w-4" />
            เพิ่มลงตะกร้า
          </Button>
          <Button
            onClick={() => {
              addToCart();
              navigate({ to: "/checkout" });
            }}
            className="h-11 flex-1 rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
          >
            ซื้อเลย
          </Button>
        </div>
      </div>
    </PageShell>
  );
}
