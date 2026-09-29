import { Link } from "@tanstack/react-router";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  Heart,
  Images,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { getFeaturedProducts, type Product } from "@/data/products";
import { useMarketplaceCards } from "@/hooks/useSupabaseCatalog";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";
import { SmartImage } from "@/components/ui/smart-image";
import { GradeBadge, MarketDiffChip } from "@/components/card/CardBits";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCategories } from "@/hooks/useSiteContent";
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

          <GradeBadge
            grade={product.grade}
            company={product.gradingCompany}
            condition={product.conditionNote}
          />
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
            <p
              className={`truncate font-display text-base font-bold sm:text-lg ${isSold ? "text-muted-foreground" : ""}`}
            >
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
        <Heart
          className={`h-4 w-4 ${wished ? "fill-primary text-primary" : "text-muted-foreground"}`}
        />
      </button>
    </article>
  );
}

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "มาใหม่" },
  { value: "price-asc", label: "ราคา: ต่ำ → สูง" },
  { value: "price-desc", label: "ราคา: สูง → ต่ำ" },
  { value: "best-selling", label: "ขายดีที่สุด" },
];

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "ทั้งหมด" },
  { value: "available", label: "พร้อมขาย" },
  { value: "locked", label: "รอชำระเงิน" },
  { value: "sold", label: "ขายแล้ว" },
];

/** ตัวกรองด่วน — กดเปิดหลายอันพร้อมกันได้ (ต้องตรงทุกเงื่อนไข) */
type QuickKey = "sqc" | "psa10" | "raw" | "under-market" | "under-1000" | "new7";
const QUICK_FILTERS: { key: QuickKey; label: string }[] = [
  { key: "sqc", label: "เกรดไทย SQC" },
  { key: "psa10", label: "PSA 10" },
  { key: "raw", label: "ไม่เกรด" },
  { key: "under-market", label: "ถูกกว่าราคากลาง" },
  { key: "under-1000", label: "ต่ำกว่า ฿1,000" },
  { key: "new7", label: "มาใหม่ 7 วัน" },
];

const STATUS_RANK: Record<string, number> = { available: 0, locked: 1, sold: 2 };

const norm = (v: string | undefined) => (v ?? "").trim().toUpperCase();
const isBlank = (v: string | undefined) =>
  !v || v.trim() === "" || v.trim() === "-" || v.trim() === "—";
const companyOf = (p: Product) => (isBlank(p.gradingCompany) ? "RAW" : norm(p.gradingCompany));
const uniq = (xs: string[]) =>
  [...new Set(xs.filter((x) => !isBlank(x)))].sort((a, b) => a.localeCompare(b, "th"));

const chip = (active: boolean) =>
  `inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition-colors active:scale-95 ${
    active
      ? "border-primary bg-primary text-primary-foreground"
      : "border-border bg-card text-muted-foreground hover:text-foreground"
  }`;

const toggleIn = <T,>(set: Set<T>, v: T) => {
  const next = new Set(set);
  if (next.has(v)) next.delete(v);
  else next.add(v);
  return next;
};

export function FeaturedMarketplace({
  showHeading = true,
  showFilter = false,
}: {
  showHeading?: boolean;
  showFilter?: boolean;
}) {
  const { data: liveCards } = useMarketplaceCards();
  const { lookup } = useMarketPriceIndex();
  // จอใหญ่เปิดเป็นแผงด้านขวาเต็มความสูง มือถือเป็นแผ่นล่างจอ — กันแผ่นล่างล้นจอบนโน้ตบุ๊ก
  const isMobile = useIsMobile();
  // หมวดเกม: "all" = ทั้งหมด, "none" = การ์ดที่ยังไม่ระบุหมวด (อื่น ๆ), นอกนั้นคือ id หมวด
  const { data: categoryRows } = useCategories();
  const categories = (categoryRows ?? []).filter((c) => c.is_active);
  const [category, setCategory] = useState("all");
  const [quick, setQuick] = useState<Set<QuickKey>>(new Set());
  const [status, setStatus] = useState("all");
  const [companies, setCompanies] = useState<Set<string>>(new Set());
  const [language, setLanguage] = useState("all");
  const [rarity, setRarity] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("newest");
  // Live Supabase rows when available, curated demo listings otherwise.
  const all = liveCards && liveCards.length > 0 ? liveCards : getFeaturedProducts();

  // ตัวเลือกในแผ่นตัวกรองมาจากสินค้าที่มีจริง ไม่โชว์ตัวเลือกที่กดแล้วได้ 0 ใบ
  const companyOptions = uniq(all.map(companyOf).filter((c) => c !== "RAW"));
  const languageOptions = uniq(all.map((p) => p.language));
  const rarityOptions = uniq(all.map((p) => p.rarity));

  const min = Number(minPrice) || 0;
  const max = Number(maxPrice) || 0;
  const weekAgo = Date.now() - 7 * 86_400_000;
  const moreCount =
    (status !== "all" ? 1 : 0) +
    companies.size +
    (language !== "all" ? 1 : 0) +
    (rarity !== "all" ? 1 : 0) +
    (min > 0 || max > 0 ? 1 : 0);
  const anyFilter = quick.size > 0 || moreCount > 0;

  const clearAll = () => {
    setQuick(new Set());
    setStatus("all");
    setCompanies(new Set());
    setLanguage("all");
    setRarity("all");
    setMinPrice("");
    setMaxPrice("");
  };

  let items = [...all];
  if (showFilter) {
    items = items.filter((p) => {
      if (category === "none" && p.categoryId) return false;
      if (category !== "all" && category !== "none" && p.categoryId !== category) return false;
      const company = companyOf(p);
      const grade = norm(p.grade).replace(/[^0-9.]/g, "");
      if (quick.has("sqc") && company !== "SQC") return false;
      if (quick.has("psa10") && !(company === "PSA" && grade === "10")) return false;
      if (quick.has("raw") && company !== "RAW") return false;
      if (quick.has("under-1000") && p.price >= 1000) return false;
      if (quick.has("new7") && (!p.createdAt || new Date(p.createdAt).getTime() < weekAgo))
        return false;
      if (quick.has("under-market")) {
        const market = lookup({
          name: p.cardName,
          set: p.setName,
          grade: p.grade,
          company: p.gradingCompany,
          condition: p.conditionNote,
        });
        const diff = diffVsMarket(p.price, market?.marketPrice);
        if (diff === null || diff >= 0) return false;
      }
      if (status !== "all" && (p.status ?? "available") !== status) return false;
      if (companies.size > 0 && !companies.has(company)) return false;
      if (language !== "all" && p.language !== language) return false;
      if (rarity !== "all" && p.rarity !== rarity) return false;
      if (min > 0 && p.price < min) return false;
      if (max > 0 && p.price > max) return false;
      return true;
    });
  }
  // เรียงตามที่เลือกก่อน แล้วดันของที่ยังซื้อได้ขึ้นหน้า (sort ของ JS คงลำดับเดิมเมื่อสถานะเท่ากัน)
  if (sort === "price-asc") items.sort((a, b) => a.price - b.price);
  else if (sort === "price-desc") items.sort((a, b) => b.price - a.price);
  else if (sort === "best-selling") items.sort((a, b) => b.soldCount - a.soldCount);
  items.sort(
    (a, b) =>
      (STATUS_RANK[a.status ?? "available"] ?? 0) - (STATUS_RANK[b.status ?? "available"] ?? 0),
  );

  const selectCls = "h-11 w-full rounded-xl border border-border bg-card px-3 text-sm";

  return (
    <section
      id="marketplace"
      className={`bg-card/30 ${showHeading ? "border-y border-border" : "mt-4 border-y border-border"}`}
    >
      <div
        className={`mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 ${showHeading ? "py-10 sm:py-14" : "pt-6 pb-16"}`}
      >
        {showHeading && (
          // หัวข้อบรรทัดเดียวแบบเดียวกับ "ประมูลสด" (ตัดป้ายเล็ก + คำอธิบายออก)
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl font-bold sm:text-[26px]">ตลาดซื้อขาย</h2>
            <Link
              to="/marketplace"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              ดูทั้งหมด <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
        {!showHeading && <h2 className="sr-only">การ์ดที่วางขายในตลาด</h2>}
        {showFilter && (
          // หน้าตลาด: หมวด + ตัวกรองค้างติดใต้แถบเมนูบนตอนเลื่อน เปลี่ยนตัวกรองได้ทุกตำแหน่ง ไม่ต้องเลื่อนกลับขึ้นไป
          <div
            className={
              showHeading
                ? undefined
                : "sticky top-16 z-30 -mx-4 bg-background/90 px-4 pb-2 backdrop-blur-lg sm:-mx-6 sm:px-6 md:top-[5.375rem] lg:-mx-8 lg:px-8"
            }
          >
            {categories.length > 0 && (
              <nav
                aria-label="หมวดเกม"
                className="-mx-4 mb-2 flex gap-1 no-scrollbar scroll-fade overflow-x-auto border-b border-border px-4 sm:mx-0 sm:px-0"
              >
                {[
                  { id: "all", name: "ทั้งหมด" },
                  ...categories.map((c) => ({ id: c.id, name: c.name })),
                  { id: "none", name: "อื่น ๆ" },
                ].map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCategory(c.id)}
                    aria-pressed={category === c.id}
                    className={`-mb-px min-h-11 shrink-0 border-b-2 px-4 text-sm font-semibold transition-colors ${
                      category === c.id
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </nav>
            )}
            <div className="-mx-4 flex items-center gap-2 no-scrollbar scroll-fade overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:[mask-image:none] sm:overflow-visible sm:px-0">
              {/* มือถือ: ปุ่ม "ตัวกรอง" อยู่หน้าสุด / จอใหญ่: อยู่ท้ายแถว — เปิดเป็นแผ่นล่างจอ */}
              <Sheet>
                <SheetTrigger asChild>
                  <button type="button" className={`${chip(moreCount > 0)} sm:order-last`}>
                    <SlidersHorizontal className="h-3.5 w-3.5" />
                    <span className="sm:hidden">ตัวกรอง</span>
                    <span className="hidden sm:inline">ตัวกรองเพิ่มเติม</span>
                    {moreCount > 0 && <span>({moreCount})</span>}
                  </button>
                </SheetTrigger>
                <SheetContent
                  side={isMobile ? "bottom" : "right"}
                  className={
                    isMobile
                      ? "flex max-h-[85dvh] flex-col rounded-t-3xl"
                      : "flex w-full flex-col sm:max-w-md"
                  }
                >
                  <SheetHeader>
                    <SheetTitle>ตัวกรอง</SheetTitle>
                  </SheetHeader>
                  <div className="-mx-6 min-h-0 flex-1 space-y-6 overflow-y-auto px-7 py-4">
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">สถานะ</legend>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_FILTERS.map((f) => (
                          <button
                            key={f.value}
                            type="button"
                            onClick={() => setStatus(f.value)}
                            aria-pressed={status === f.value}
                            className={chip(status === f.value)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">บริษัทเกรด</legend>
                      <div className="flex flex-wrap gap-2">
                        {[...companyOptions, "RAW"].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setCompanies((s) => toggleIn(s, c))}
                            aria-pressed={companies.has(c)}
                            className={chip(companies.has(c))}
                          >
                            {c === "RAW" ? "ไม่เกรด" : c}
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend className="mb-2 text-sm font-semibold">ช่วงราคา (บาท)</legend>
                      <div className="flex items-center gap-2">
                        <input
                          inputMode="numeric"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value.replace(/\D/g, ""))}
                          placeholder="ต่ำสุด"
                          aria-label="ราคาต่ำสุด"
                          className={selectCls}
                        />
                        <span className="text-muted-foreground">–</span>
                        <input
                          inputMode="numeric"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value.replace(/\D/g, ""))}
                          placeholder="สูงสุด"
                          aria-label="ราคาสูงสุด"
                          className={selectCls}
                        />
                      </div>
                    </fieldset>
                    {languageOptions.length > 0 && (
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold">ภาษา</span>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value)}
                          className={selectCls}
                        >
                          <option value="all">ทุกภาษา</option>
                          {languageOptions.map((l) => (
                            <option key={l} value={l}>
                              {l}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    {rarityOptions.length > 0 && (
                      <label className="block">
                        <span className="mb-2 block text-sm font-semibold">Rarity</span>
                        <select
                          value={rarity}
                          onChange={(e) => setRarity(e.target.value)}
                          className={selectCls}
                        >
                          <option value="all">ทุก Rarity</option>
                          {rarityOptions.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2 border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={clearAll}
                      className="min-h-12 rounded-xl border border-border px-5 text-sm font-semibold"
                    >
                      ล้าง
                    </button>
                    <SheetClose asChild>
                      <button
                        type="button"
                        className="min-h-12 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground"
                      >
                        ดู {items.length} ใบ
                      </button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
              {QUICK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setQuick((s) => toggleIn(s, f.key))}
                  aria-pressed={quick.has(f.key)}
                  className={chip(quick.has(f.key))}
                >
                  {f.label}
                </button>
              ))}
              <div className="relative order-last shrink-0 sm:ml-auto">
                <ArrowDownWideNarrow className="pointer-events-none absolute top-1/2 left-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label="เรียงลำดับสินค้า"
                  className="h-10 cursor-pointer appearance-none rounded-full border border-border bg-card pr-9 pl-9 text-xs font-semibold text-foreground shadow-sm transition-colors hover:border-primary/40 focus:border-primary focus:outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      เรียง: {o.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute top-1/2 right-3.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
        {showFilter && (
          <div className="mb-5">
            <p className="mt-2 text-sm text-muted-foreground">
              พบ {items.length} ใบ
              {anyFilter && (
                <>
                  {" · "}
                  <button
                    type="button"
                    onClick={clearAll}
                    className="font-semibold text-primary underline-offset-2 hover:underline"
                  >
                    ล้างตัวกรอง
                  </button>
                </>
              )}
            </p>
          </div>
        )}
        {items.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            {anyFilter ? "ไม่พบการ์ดที่ตรงกับตัวกรอง ลองเอาบางตัวกรองออก" : "ยังไม่มีสินค้าในตลาด"}
          </p>
        )}
        <div className="grid grid-cols-2 items-start gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
          {items.map((product, i) => (
            // หน้าแรกบนมือถือแสดง 4 ใบ (จอใหญ่แสดงครบ) ที่เหลือดูได้ที่ปุ่มด้านล่าง
            <div key={product.id} className={showHeading && i >= 4 ? "hidden sm:block" : undefined}>
              <ProductGridCard product={product} />
            </div>
          ))}
        </div>
        {showHeading && items.length > 4 && (
          <Link
            to="/marketplace"
            className="mt-4 flex min-h-12 items-center justify-center gap-1.5 rounded-2xl border border-border bg-card text-sm font-semibold sm:hidden"
          >
            ดูตลาดซื้อขายทั้งหมด <ArrowRight className="h-4 w-4" />
          </Link>
        )}
      </div>
    </section>
  );
}
