import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { BadgeCheck, ChevronRight, Heart, Loader2, Lock, QrCode, ShoppingBag, Star, Truck } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { ProductGridCard } from "@/components/sections/FeaturedMarketplace";
import { PageShell } from "@/components/site/PageShell";
import { BackButton } from "@/components/site/BackButton";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { CardGallery } from "@/components/card/CardGallery";
import { MarketDiffChip } from "@/components/card/CardBits";
import { useMarketPriceIndex } from "@/hooks/useMarketStats";
import { diffVsMarket, gradeDisplay } from "@/lib/market-price";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";

import { getProductById, getRelatedProducts, type Product } from "@/data/products";
import { useBuyNow, useMyPendingOrder } from "@/hooks/useCardDetail";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useLiveProduct, useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { thb, useCart } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { supabase } from "@/integrations/supabase/client";

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

/** สิ่งที่ผู้ซื้อได้รับจริงจากระบบ (ล็อกการ์ดตอนกดซื้อ, เลขพัสดุ, QR PromptPay ภายใน payment_due_at 24 ชม.) */
const TRUST_POINTS = [
  // หัวข้อสั้นพอให้อยู่บรรทัดเดียวในคอลัมน์แคบ รายละเอียดตัดบรรทัดได้
  { icon: Lock, title: "กันซื้อซ้อน", detail: "ล็อกการ์ดทันทีที่กดซื้อ" },
  { icon: Truck, title: "มีเลขพัสดุ", detail: "ติดตามได้ทุกขั้น" },
  { icon: QrCode, title: "จ่ายผ่าน QR", detail: "PromptPay ภายใน 24 ชม." },
] as const;

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
  const { lookup } = useMarketPriceIndex();

  // ผู้ใช้คนนี้กดดำเนินการชำระเงินสินค้านี้ไว้แล้วแต่ยังไม่จ่าย -> พาไปหน้าชำระเงินรายการเดิมทันที
  // ใช้ replace เพื่อให้กดย้อนกลับจากหน้าชำระเงินแล้วกลับไปหน้าตลาด ไม่วนกลับมาหน้านี้ซ้ำ
  const myPending = useMyPendingOrder(demo ? undefined : id);
  const pendingOrderId = myPending.data?.id ?? null;
  useEffect(() => {
    if (!pendingOrderId) return;
    toast.info("คุณมีคำสั่งซื้อที่รอชำระสำหรับสินค้านี้ กำลังพาไปหน้าชำระเงิน");
    void navigate({ to: "/checkout/$id", params: { id: pendingOrderId }, replace: true });
  }, [pendingOrderId, navigate]);

  // หน้านี้สำหรับการ์ดขายราคาตายตัว — ลิงก์เก่า/ที่แชร์มาของการ์ดประมูลให้เด้งไปหน้าประมูล /card
  const isAuctionCard = live?.saleType === "auction";
  useEffect(() => {
    if (!isAuctionCard) return;
    void navigate({ to: "/card/$id", params: { id }, replace: true });
  }, [isAuctionCard, id, navigate]);

  if (pendingOrderId || isAuctionCard || (!demo && liveQuery.isLoading)) {
    return (
      <PageShell
        eyebrow="ตลาดซื้อขาย"
        title={pendingOrderId ? "กำลังพาไปหน้าชำระเงิน" : "กำลังโหลดรายละเอียด"}
        description="โปรดรอสักครู่"
      >
        <div className="flex h-56 items-center justify-center text-muted-foreground">
          <LogoLoader size={64} />
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
  const cardStatus = isLive ? live?.status : product.status;
  const soldOut = cardStatus === "sold";
  const pendingPayment = cardStatus === "locked";
  // ฉบับร่าง / ผู้ขายซ่อนจากตลาด -> ยังเปิดดูจากลิงก์ได้ แต่ซื้อไม่ได้
  const notOnSale = isLive && product.isPublished === false;
  const stockLeft = isLive ? (product.stockQuantity ?? null) : null;

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

  const market = lookup({
    name: product.cardName,
    set: product.setName,
    grade: product.grade,
    company: product.gradingCompany,
    condition: product.conditionNote,
  });
  const diff = soldOut ? null : diffVsMarket(product.price, market?.marketPrice);
  const gradeText = gradeDisplay(product.grade, product.gradingCompany, product.conditionNote);
  const clean = (v: string) => (v && v !== "-" ? v : "");
  const specs = [
    { label: "ชุด", value: clean(product.setName) },
    { label: "หมายเลขการ์ด", value: clean(product.cardNo) },
    { label: "ปี", value: product.year ? String(product.year) : "" },
    { label: "ภาษา", value: clean(product.language) },
    { label: "Rarity", value: clean(product.rarity) },
    { label: "สภาพ", value: clean(product.conditionNote) },
    { label: "สถาบันเกรด", value: clean(product.gradingCompany) },
    { label: "เลขใบรับรอง", value: clean(product.certificationNo) },
  ].filter((s) => s.value);

  const disabled = soldOut || pendingPayment || notOnSale;
  const buyLabel = notOnSale
    ? "ยังไม่เปิดขาย"
    : soldOut
      ? stockLeft === 0
        ? "สินค้าหมด"
        : "สินค้าถูกซื้อแล้ว"
      : pendingPayment
        ? "กำลังรอการชำระเงิน"
        : "ซื้อเลย";

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

  const wishButton = (
    <button
      type="button"
      onClick={toggleWish}
      aria-label={wished ? "นำออกจากรายการที่อยากได้" : "เพิ่มลงรายการที่อยากได้"}
      aria-pressed={wished}
      className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-border transition-colors hover:bg-secondary hover:ring-primary/40"
    >
      <Heart className={`h-5 w-5 ${wished ? "fill-primary text-primary" : "text-muted-foreground"}`} />
    </button>
  );
  const cartButton = (
    <Button
      variant="outline"
      onClick={addToCart}
      disabled={disabled}
      aria-label="เพิ่มลงตะกร้า"
      // outline ปกติ hover เป็นสีเขียวอมฟ้า (accent) → ใช้พื้นครีม + ขอบส้มให้เข้ากับปุ่มซื้อ
      className="min-h-12 shrink-0 rounded-xl border-border bg-card px-4 font-semibold hover:border-primary/40 hover:bg-secondary hover:text-foreground lg:flex-1"
    >
      <ShoppingBag className="h-4 w-4" />
      <span className="hidden lg:inline">เพิ่มลงตะกร้า</span>
    </Button>
  );
  const buyButton = (
    <Button
      onClick={buyLive}
      disabled={buyNow.isPending || disabled}
      className="min-h-12 flex-1 rounded-xl text-base font-semibold hover:bg-primary hover:brightness-95 active:brightness-90"
    >
      {buyNow.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
      {buyLabel}
    </Button>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 pt-4 pb-8 sm:px-6 lg:px-8 lg:pt-8 lg:pb-16">
        <nav aria-label="breadcrumb" className="mb-4 flex items-center gap-2 text-xs text-muted-foreground lg:mb-6">
          <BackButton className="lg:hidden" />
          <div className="ml-auto lg:hidden">{wishButton}</div>
          <span className="hidden items-center gap-1.5 lg:flex">
            <Link to="/marketplace" className="hover:text-foreground">
              ตลาดซื้อขาย
            </Link>
            <ChevronRight className="h-3.5 w-3.5" />
            {clean(product.setName) && (
              <>
                <span>{product.setName}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </>
            )}
            <span className="truncate text-foreground">{product.cardName}</span>
          </span>
        </nav>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          {/* แกลเลอรี — ติดอยู่กับที่ตอนเลื่อนบนเดสก์ท็อป */}
          <div className="lg:sticky lg:top-28">
            <CardGallery
              images={product.images}
              alt={`${product.cardName} ${gradeText}`}
              status={soldOut ? "sold" : pendingPayment ? "locked" : "available"}
              dimmed={soldOut}
            />
          </div>

          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {clean(product.setName) || "Taletails Collection"}
              {product.isVerified && <BadgeCheck className="h-4 w-4 text-accent" aria-label="ตรวจสอบแล้ว" />}
            </p>
            <h1 className="mt-1 font-display text-2xl leading-tight font-bold break-words sm:text-3xl">
              {product.cardName}
            </h1>

            <div className="mt-3 flex flex-wrap gap-1.5 text-xs font-medium">
              {/* ชิปเกรด/สภาพสีเข้มเด่นสุด — แทนป้ายที่เคยทับอยู่บนรูป */}
              {gradeText && (
                <span className="rounded-full bg-foreground px-3 py-1 font-semibold text-background">{gradeText}</span>
              )}
              {product.isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 font-semibold text-accent">
                  <BadgeCheck className="h-3.5 w-3.5" /> ตรวจสอบแล้ว
                </span>
              )}
              {clean(product.language) && (
                <span className="rounded-full bg-secondary px-3 py-1">ภาษา{product.language}</span>
              )}
              {clean(product.rarity) && <span className="rounded-full bg-secondary px-3 py-1">{product.rarity}</span>}
            </div>

            {/* ราคา + ปุ่มซื้อ + สิ่งที่ผู้ซื้อได้รับ รวมในกล่องเดียว */}
            <section className="mt-5 rounded-2xl bg-card p-4 ring-1 ring-border sm:p-5">
              <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">ราคา</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <p className={`font-display text-3xl leading-none font-bold tracking-tight tabular-nums sm:text-4xl ${soldOut ? "text-muted-foreground" : ""}`}>
                      {thb.format(product.price)}
                    </p>
                    <MarketDiffChip diff={diff} className="text-xs" />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs">
                  {stockLeft !== null && !notOnSale && (
                    <span className={`font-semibold ${stockLeft > 0 && stockLeft <= 3 ? "text-primary" : stockLeft === 0 ? "text-destructive" : "text-muted-foreground"}`}>
                      {stockLeft > 0 ? `เหลือ ${stockLeft} ชิ้น` : "สินค้าหมด"}
                    </span>
                  )}
                  {market?.marketPrice ? (
                    <Link to="/market/$id" params={{ id: market.id }} className="font-semibold text-primary hover:underline">
                      ราคากลาง {thb.format(market.marketPrice)}
                    </Link>
                  ) : null}
                </div>
              </div>

              {/* ปุ่มซื้อ (เดสก์ท็อป) — มือถือใช้แถบล่าง */}
              <div className="mt-4 hidden items-center gap-2.5 lg:flex">
                {buyButton}
                {cartButton}
                {wishButton}
              </div>

              <ul className="mt-4 grid gap-3 border-t border-border/70 pt-4 text-[13px] leading-snug sm:grid-cols-3">
                {TRUST_POINTS.map(({ icon: Icon, title, detail }) => (
                  <li key={title} className="flex items-start gap-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="text-muted-foreground">{detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* ร้านค้า */}
            <div className="mt-4 flex items-center gap-3 rounded-2xl bg-card p-4 ring-1 ring-border">
              <img src="/taletails-logo.jpg" alt="" className="h-11 w-11 rounded-full object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{product.storeName}</p>
                <p className="text-xs text-muted-foreground">
                  {product.soldCount > 0 ? `การ์ดรุ่นนี้ขายไปแล้ว ${product.soldCount} ชิ้น` : "ร้านค้าบน Taletails"}
                </p>
              </div>
            </div>

            {/* ข้อมูลการ์ด — แสดงเฉพาะช่องที่มีข้อมูลจริง */}
            {specs.length > 0 && (
              <dl className="mt-4 grid gap-x-8 gap-y-3 rounded-2xl bg-card p-4 text-sm ring-1 ring-border sm:grid-cols-2 sm:px-5">
                {specs.map((s) => (
                  <div key={s.label} className="flex items-baseline justify-between gap-4">
                    <dt className="shrink-0 text-muted-foreground">{s.label}</dt>
                    <dd className="text-right font-semibold break-words">{s.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {product.sellerNote && (
              <div className="mt-4 rounded-2xl bg-secondary/50 p-4">
                <p className="text-xs font-semibold text-muted-foreground">รายละเอียดจากผู้ขาย</p>
                <p className="mt-1 text-sm break-words whitespace-pre-line">{product.sellerNote}</p>
              </div>
            )}

            {/* รีวิว */}
            {product.reviews.length > 0 && (
              <section className="surface-panel mt-4 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-display text-xl font-bold">{product.rating.toFixed(1)}</span>
                    <Stars rating={product.rating} />
                  </div>
                  <span className="text-xs text-muted-foreground">{product.reviews.length} รีวิว</span>
                </div>
                <ul className="mt-3 space-y-3">
                  {product.reviews.map((review) => (
                    <li key={review.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2">
                        <Stars rating={review.rating} />
                        <span className="text-xs text-muted-foreground">{review.timeAgo}</span>
                      </div>
                      <p className="mt-1 text-sm">{review.comment}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <Accordion type="multiple" className="surface-panel mt-4 px-4 py-1">
              <AccordionItem value="authenticity">
                <AccordionTrigger className="py-4 text-sm font-semibold">การตรวจสอบของแท้</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  ทุกใบผ่านการตรวจสอบโดยทีม Taletails
                  {clean(product.gradingCompany) ? ` และยืนยันรหัสจาก ${product.gradingCompany}` : ""} ก่อนส่งถึงมือผู้ซื้อ
                  รหัสรายการ: {product.cardIdCode}
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="shipping">
                <AccordionTrigger className="py-4 text-sm font-semibold">การจัดส่งและการคืนสินค้า</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  จัดส่งภายใน 1–2 วันทำการ พร้อมกล่องกันกระแทกและประกันการขนส่งเต็มมูลค่า
                  คืนสินค้าได้ภายใน 7 วันหากสภาพไม่ตรงตามที่ระบุ
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-12">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">สินค้าที่คุณอาจจะชอบ</h2>
              <Link to="/marketplace" className="flex items-center gap-1 text-sm font-semibold text-primary">
                ดูทั้งหมด <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
              {related.map((item) => (
                <ProductGridCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* แถบซื้อด้านล่าง (มือถือ) — เมนูล่างของเว็บถูกซ่อนในหน้านี้ จึงเหลือแถบเดียว */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-xl items-center gap-2.5">
          <div className="mr-1 min-w-0">
            <p className="truncate font-display text-xl leading-tight font-bold tabular-nums">{thb.format(product.price)}</p>
            {stockLeft !== null && stockLeft > 0 && !notOnSale && (
              <p className="text-[11px] font-semibold text-primary">เหลือ {stockLeft} ชิ้น</p>
            )}
          </div>
          {cartButton}
          {buyButton}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
