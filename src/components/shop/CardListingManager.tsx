import { Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  FolderTree,
  Gavel,
  Images,
  Loader2,
  Lock,
  MoreHorizontal,
  Package,
  PackageOpen,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { EditImagesButton } from "@/components/shop/EditImagesDialog";
import { NewListingSheet } from "@/components/shop/NewListingSheet";
import {
  BUCKETS,
  listingState,
  type BadgeTone,
  type ListingBucket,
  type ListingState,
} from "@/components/shop/listing-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import {
  useAdminCards,
  useDeleteCard,
  useMyCards,
  useRelistAuction,
  useUpdateAuctionEndTime,
  useUpdateCardListing,
  useSetCardCategory,
  type AdminCardRow,
} from "@/hooks/useAdmin";
import { useCategories } from "@/hooks/useSiteContent";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 10;

type Filter = ListingBucket | "all" | "ship" | "low";
type Panel = "stock" | "end" | "relist" | "draft" | "category" | null;

const TONE: Record<BadgeTone, string> = {
  live: "bg-primary/12 text-primary",
  wait: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  ok: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  muted: "bg-secondary text-muted-foreground",
  danger: "bg-destructive/10 text-destructive",
};

/**
 * รายการสินค้าของร้าน (ใช้ทั้ง /shop และหลังบ้าน /admin)
 * โครง: ต้องทำตอนนี้ → ตัวกรองสถานะ + ค้นหา → แถวสินค้า (ปุ่มหลัก 1 ปุ่ม + เมนู ⋯)
 */
export function CardListingManager({
  scope = "admin",
  header,
}: {
  scope?: "admin" | "shop";
  /** ส่วนหัวร้าน (รูป + ชื่อร้าน) วางซ้ายของปุ่ม "ลงการ์ดใหม่" */
  header?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const adminCards = useAdminCards(scope === "admin");
  const myCards = useMyCards(scope === "shop");
  const cards = scope === "shop" ? myCards : adminCards;

  // นับเวลาเพื่อให้สถานะ (รอชำระ → เลยเวลา) เปลี่ยนเองโดยไม่ต้องรีเฟรช
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(
    () => (cards.data ?? []).map((c) => ({ c, s: listingState(c, now) })),
    [cards.data, now],
  );

  const counts = useMemo(() => {
    const byBucket: Record<ListingBucket | "all", number> = {
      all: rows.length,
      selling: 0,
      auction: 0,
      payment: 0,
      sold: 0,
      draft: 0,
    };
    let ship = 0;
    let low = 0;
    let live = 0;
    for (const { s } of rows) {
      byBucket[s.bucket] += 1;
      ship += s.toShip;
      if (s.lowStock) low += 1;
      if (s.activeAuction) live += 1;
    }
    return { byBucket, ship, low, live };
  }, [rows]);

  const q = query.trim().toLowerCase();
  const filtered = rows.filter(({ c, s }) => {
    if (filter === "ship" && s.toShip === 0) return false;
    if (filter === "low" && !s.lowStock) return false;
    if (filter !== "all" && filter !== "ship" && filter !== "low" && s.bucket !== filter)
      return false;
    if (q && !`${c.name} ${c.set_name ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const pick = (f: Filter) => {
    setFilter((cur) => (cur === f && f !== "all" ? "all" : f));
    setPage(1);
  };

  const todo: { key: Filter; label: string; value: number; hint: string; urgent?: boolean }[] = [
    {
      key: "ship",
      label: "ต้องจัดส่ง",
      value: counts.ship,
      hint: counts.ship ? "ลูกค้าชำระแล้ว" : "ไม่มีค้าง",
      urgent: counts.ship > 0,
    },
    { key: "payment", label: "รอชำระ", value: counts.byBucket.payment, hint: "ลูกค้ากำลังจ่าย" },
    { key: "auction", label: "ประมูลเปิดอยู่", value: counts.live, hint: "รวมที่ตั้งเวลาไว้" },
    { key: "low", label: "สต็อกใกล้หมด", value: counts.low, hint: "เหลือ 1-2 ชิ้น" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {header ?? (
          <h2 className="font-display text-lg font-semibold">
            {scope === "shop" ? "สินค้าในร้านของฉัน" : "การ์ดในระบบ"}
          </h2>
        )}
        {/* จอใหญ่: ปุ่มหลักข้างหัวร้าน · มือถือ: ปุ่มลอยมุมล่าง (ด้านล่าง) */}
        <Button className="hidden min-h-11 rounded-xl sm:inline-flex" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          ลงการ์ดใหม่
        </Button>
      </div>

      <NewListingSheet open={open} onOpenChange={setOpen} />

      {/* ต้องทำตอนนี้ — กดแล้วกรองรายการให้ กดซ้ำเพื่อยกเลิก */}
      <section aria-label="ต้องทำตอนนี้" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <div className="grid min-w-[36rem] grid-cols-4 gap-3 sm:min-w-0">
          {todo.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => pick(t.key)}
              aria-pressed={filter === t.key}
              className={cn(
                "rounded-2xl border bg-card p-3.5 text-left transition-colors hover:bg-secondary/50 sm:p-4",
                filter === t.key ? "border-primary ring-1 ring-primary" : "border-border",
                t.urgent && filter !== t.key && "border-emerald-500/50",
              )}
            >
              <span className="block text-xs text-muted-foreground">{t.label}</span>
              <span
                className={cn(
                  "block font-display text-2xl leading-tight font-bold tabular-nums",
                  t.urgent && "text-emerald-700 dark:text-emerald-400",
                )}
              >
                {cards.isLoading ? "-" : t.value}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">{t.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div
            className="-mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0"
            role="tablist"
            aria-label="กรองตามสถานะ"
          >
            {BUCKETS.map((b) => {
              const active = filter === b.key;
              return (
                <button
                  key={b.key}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => pick(b.key)}
                  className={cn(
                    "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition-colors",
                    active
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {b.label}
                  <span className="tabular-nums opacity-70">{counts.byBucket[b.key]}</span>
                </button>
              );
            })}
          </div>
          <label className="relative lg:ml-auto lg:w-64">
            <span className="sr-only">ค้นหาสินค้า</span>
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหาชื่อการ์ด, ชุด"
              className="min-h-11 rounded-xl pl-10"
            />
          </label>
        </div>
        {(filter === "ship" || filter === "low") && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            กำลังแสดง: {filter === "ship" ? "ต้องจัดส่ง" : "สต็อกใกล้หมด"}
            <button
              type="button"
              onClick={() => pick("all")}
              className="inline-flex items-center gap-1 font-semibold text-primary"
            >
              <X className="h-3.5 w-3.5" /> ล้าง
            </button>
          </p>
        )}
      </div>

      {cards.isLoading ? (
        <ul className="space-y-2" aria-busy="true" aria-label="กำลังโหลดรายการสินค้า">
          {Array.from({ length: 5 }).map((_, i) => (
            <li
              key={i}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
            >
              <Skeleton className="h-[70px] w-[50px] shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="hidden h-10 w-28 rounded-xl sm:block" />
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <PackageOpen className="h-6 w-6" />
          </span>
          <h3 className="font-display text-base font-semibold">
            {scope === "shop" ? "ยังไม่มีสินค้าในร้านของคุณ" : "ยังไม่มีการ์ดในระบบ"}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            เริ่มจากลงการ์ดใบแรก เลือกได้ว่าจะขายราคาปกติหรือเปิดประมูล
          </p>
          <Button className="min-h-11 rounded-xl" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            ลงการ์ดใบแรก
          </Button>
        </section>
      ) : filtered.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          ไม่มีสินค้าที่ตรงกับตัวกรองนี้
        </p>
      ) : (
        <>
          <ul className="space-y-2">
            {pageItems.map(({ c, s }) => (
              <ListingRow key={c.id} card={c} state={s} scope={scope} />
            ))}
          </ul>

          {pageCount > 1 && (
            <nav
              className="flex items-center justify-between gap-2"
              aria-label="แบ่งหน้ารายการสินค้า"
            >
              <Button
                variant="secondary"
                className="min-h-11 rounded-xl px-3 text-xs"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
                ก่อนหน้า
              </Button>
              <span className="text-xs text-muted-foreground">
                หน้า {safePage} / {pageCount} ({filtered.length} รายการ)
              </span>
              <Button
                variant="secondary"
                className="min-h-11 rounded-xl px-3 text-xs"
                disabled={safePage === pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                ถัดไป
                <ChevronRight className="h-4 w-4" />
              </Button>
            </nav>
          )}
        </>
      )}

      {/* มือถือ: ปุ่มลงการ์ดลอยมุมล่าง เหนือแถบเมนูล่าง */}
      <Button
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 min-h-13 rounded-full px-5 shadow-[0_12px_28px_-10px_color-mix(in_oklch,var(--primary)_70%,transparent)] sm:hidden"
      >
        <Plus className="h-5 w-5" />
        ลงการ์ดใหม่
      </Button>
    </div>
  );
}

/** แถวสินค้า 1 ใบ: ข้อมูลหลัก + ปุ่มหลักตามสถานะ + เมนู ⋯ (ปุ่มรอง) + แผงแก้ไขที่กางลงมา */
function ListingRow({
  card: c,
  state: s,
  scope,
}: {
  card: AdminCardRow;
  state: ListingState;
  scope: "admin" | "shop";
}) {
  const [panel, setPanel] = useState<Panel>(null);
  const [editImages, setEditImages] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = useUpdateCardListing();
  const del = useDeleteCard();
  const { data: categories } = useCategories();
  const categoryName = categories?.find((x) => x.id === c.category_id)?.name;
  const viewTo = c.sale_type === "fixed_price" ? ("/product/$id" as const) : ("/card/$id" as const);
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const price = s.auction?.current_price ?? c.price;
  const auctionFailed =
    !!s.auction && !s.activeAuction && !s.managementLocked && c.status !== "sold";

  const togglePublish = () =>
    update.mutate(
      { cardId: c.id, isPublished: !c.is_published },
      {
        onSuccess: () =>
          toast.success(
            c.is_published ? "ซ่อนจากร้านแล้ว (ยังอยู่ในรายการของคุณ)" : "แสดงในร้านแล้ว",
          ),
        onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
      },
    );

  // ---- ปุ่มหลัก: 1 ปุ่มต่อแถว ตามสิ่งที่ควรทำต่อ ----
  const btn = "min-h-11 rounded-xl px-4 text-xs sm:text-sm";
  let primary: ReactNode;
  if (s.isDraftAuction) {
    primary = (
      <Button className={btn} onClick={() => toggle("draft")}>
        <Gavel className="h-4 w-4" /> เปิดประมูล
      </Button>
    );
  } else if (s.toShip > 0 && scope === "admin") {
    primary = (
      <Button asChild className={btn}>
        <Link to="/admin/orders">
          <Truck className="h-4 w-4" /> ไปจัดส่ง
        </Link>
      </Button>
    );
  } else if (scope === "admin" && (s.paymentOverdue || auctionFailed)) {
    primary = (
      <Button className={btn} onClick={() => toggle("relist")}>
        <Gavel className="h-4 w-4" /> เปิดรอบใหม่
      </Button>
    );
  } else if (c.sale_type === "fixed_price" && !c.is_published) {
    primary = (
      <Button className={btn} disabled={update.isPending} onClick={togglePublish}>
        {update.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
        ลงตลาด
      </Button>
    );
  } else if (
    c.sale_type === "fixed_price" &&
    (s.lowStock || s.bucket === "sold") &&
    c.status !== "locked"
  ) {
    primary = (
      <Button variant="secondary" className={btn} onClick={() => toggle("stock")}>
        <Package className="h-4 w-4" /> เติมสต็อก
      </Button>
    );
  } else {
    primary = (
      <Button asChild variant="secondary" className={btn}>
        <Link to={viewTo} params={{ id: c.id }}>
          {s.activeAuction ? "ดูห้องประมูล" : "ดูหน้าขาย"}
        </Link>
      </Button>
    );
  }

  const menu = renderMenu();
  const meta = [c.set_name, c.grade ? `เกรด ${c.grade}` : null, categoryName]
    .filter(Boolean)
    .join(" · ");

  return (
    <li className="rounded-2xl border border-border bg-card">
      <div className="flex items-start gap-3 p-3 sm:items-center sm:gap-4">
        <Link
          to={viewTo}
          params={{ id: c.id }}
          className="h-[70px] w-[50px] shrink-0 overflow-hidden rounded-lg bg-tile"
          aria-label={`ดูหน้าขาย ${c.name}`}
        >
          {c.images?.[0] && (
            <SmartImage src={c.images[0]} alt="" transformWidth={120} className="object-cover" />
          )}
        </Link>

        <div className="min-w-0 flex-1 sm:grid sm:grid-cols-[minmax(0,1fr)_11rem_7rem] sm:items-center sm:gap-4">
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {c.sale_type === "auction" ? "ประมูล" : "ราคาปกติ"}
              {meta && ` · ${meta}`}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:mt-0">
            <span
              className={cn(
                "inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-semibold",
                TONE[s.badge.tone],
              )}
            >
              {s.badge.label}
            </span>
            {s.scheduled && s.auction?.start_time && (
              <span className="text-[11px] text-muted-foreground">
                เปิด{" "}
                {new Date(s.auction.start_time).toLocaleString("th-TH", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2 sm:mt-0 sm:block sm:text-right">
            <p className="font-display font-semibold tabular-nums">{thb.format(price)}</p>
            <p
              className={cn(
                "text-[11px]",
                s.lowStock ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {c.sale_type === "fixed_price"
                ? c.stock_quantity === null
                  ? "ชิ้นเดียว"
                  : `สต็อก ${c.stock_quantity}${s.lowStock ? " ใกล้หมด" : ""}`
                : s.auction
                  ? `${Number(s.auction.bid_count ?? 0)} ครั้งที่เสนอ`
                  : ""}
            </p>
          </div>
        </div>

        <div className="hidden shrink-0 items-center gap-2 sm:flex">
          {primary}
          {menu}
        </div>
        <div className="shrink-0 sm:hidden">{menu}</div>
      </div>

      {/* มือถือ: ปุ่มหลักเต็มความกว้างใต้ข้อมูล */}
      <div className="px-3 pb-3 sm:hidden [&>*]:w-full">{primary}</div>

      {panel && (
        <div className="flex flex-wrap items-center gap-2 border-t border-dashed border-border px-3 py-3 sm:px-4">
          {panel === "stock" && <StockControl card={c} onDone={() => setPanel(null)} />}
          {panel === "draft" && <PublishAuctionDraft cardId={c.id} onDone={() => setPanel(null)} />}
          {panel === "relist" && s.auction && (
            <RelistAuctionControl auctionId={s.auction.id} onDone={() => setPanel(null)} />
          )}
          {panel === "category" && (
            <CardCategorySelect
              cardId={c.id}
              value={c.category_id ?? null}
              onDone={() => setPanel(null)}
            />
          )}
          {panel === "end" && s.auction && (
            <EndTimeControl
              auctionId={s.auction.id}
              endTime={s.auction.end_time}
              onDone={() => setPanel(null)}
            />
          )}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto min-h-11 min-w-11 rounded-xl"
            aria-label="ปิด"
            onClick={() => setPanel(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {s.managementLocked && c.sale_type === "auction" && (
        <p className="flex items-center gap-1.5 border-t border-dashed border-border px-3 py-2 text-[11px] text-muted-foreground sm:px-4">
          <Lock className="h-3 w-3" /> {s.lockedNote}
        </p>
      )}
      {s.paymentOverdue && scope !== "admin" && (
        <p className="flex items-center gap-1.5 border-t border-dashed border-border px-3 py-2 text-[11px] text-destructive sm:px-4">
          <AlarmClock className="h-3 w-3" /> ผู้ชนะไม่ชำระเงินตามเวลา ติดต่อทีมงานเพื่อเปิดรอบใหม่
        </p>
      )}

      <EditImagesButton
        cardId={c.id}
        cardName={c.name}
        images={c.images ?? []}
        open={editImages}
        onOpenChange={setEditImages}
      />

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ลบ "{c.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              การ์ดจะหายจากร้านถาวร แต่ยังอยู่ในประวัติการลงขาย ถ้าแค่อยากเก็บไว้ก่อน ใช้
              "ซ่อนจากร้าน" แทน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11 rounded-xl">ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                del.mutate(c.id, {
                  onSuccess: () => toast.success("ลบการ์ดแล้ว"),
                  onError: (e) => toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
                })
              }
            >
              ลบการ์ด
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );

  function renderMenu() {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="min-h-11 min-w-11 rounded-xl"
            aria-label={`ตัวเลือกเพิ่มเติม ${c.name}`}
          >
            <MoreHorizontal className="h-5 w-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60 rounded-xl p-1.5">
          <DropdownMenuItem asChild className="min-h-10 rounded-lg">
            <Link to={viewTo} params={{ id: c.id }}>
              <Eye className="h-4 w-4" /> ดูหน้าขาย
            </Link>
          </DropdownMenuItem>
          {c.sale_type === "fixed_price" && c.status !== "locked" && (
            <DropdownMenuItem className="min-h-10 rounded-lg" onSelect={() => setPanel("stock")}>
              <Package className="h-4 w-4" /> แก้จำนวนสต็อก
            </DropdownMenuItem>
          )}
          {s.auction && s.activeAuction && !s.managementLocked && (
            <DropdownMenuItem className="min-h-10 rounded-lg" onSelect={() => setPanel("end")}>
              <Clock className="h-4 w-4" /> แก้เวลาปิดประมูล
            </DropdownMenuItem>
          )}
          {/* ขายหมดเกิน 14 วัน: แก้รูปแล้ว updated_at เปลี่ยน การ์ดจะกลับขึ้นตลาด → ไม่ให้แก้ */}
          {!s.expiredFromMarket && (
            <DropdownMenuItem className="min-h-10 rounded-lg" onSelect={() => setEditImages(true)}>
              <Images className="h-4 w-4" /> แก้รูป / เรียงรูป
            </DropdownMenuItem>
          )}
          {!s.expiredFromMarket && (
            <DropdownMenuItem className="min-h-10 rounded-lg" onSelect={() => setPanel("category")}>
              <FolderTree className="h-4 w-4" /> เปลี่ยนหมวด
            </DropdownMenuItem>
          )}
          {s.canTogglePublish && (
            <DropdownMenuItem className="min-h-10 rounded-lg" onSelect={togglePublish}>
              {c.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {c.is_published ? "ซ่อนจากร้าน" : "แสดงในร้าน"}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {s.deleteBlockedNote ? (
            <DropdownMenuItem disabled className="min-h-10 items-start rounded-lg text-xs">
              <Lock className="mt-0.5 h-4 w-4" /> {s.deleteBlockedNote}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              className="min-h-10 rounded-lg text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> ลบการ์ด
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
}

/** แก้เวลาปิดของรอบประมูลที่เปิดอยู่ */
function EndTimeControl({
  auctionId,
  endTime,
  onDone,
}: {
  auctionId: string;
  endTime: string;
  onDone?: (() => void) | undefined;
}) {
  const setEnd = useUpdateAuctionEndTime();
  const [value, setValue] = useState(() => {
    const d = new Date(endTime);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });
  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
      <Input
        type="datetime-local"
        aria-label="เวลาปิดประมูล"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-11 w-full rounded-xl text-sm sm:w-auto sm:flex-1"
      />
      <Button
        variant="secondary"
        disabled={setEnd.isPending || !value}
        className="min-h-11 flex-1 rounded-xl px-4 sm:flex-none"
        onClick={() =>
          setEnd.mutate(
            { auctionId, endTime: value },
            {
              onSuccess: () => {
                toast.success("อัปเดตเวลาปิดประมูลแล้ว");
                onDone?.();
              },
              onError: (err) => toast.error(err instanceof Error ? err.message : "ไม่สำเร็จ"),
            },
          )
        }
      >
        {setEnd.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        บันทึกเวลาปิด
      </Button>
    </div>
  );
}

/** ปุ่มเปิดประมูลใหม่ สำหรับรอบที่ผู้ชนะไม่ชำระเงินหรือปิดไปแล้ว */
function RelistAuctionControl({
  auctionId,
  onDone,
}: {
  auctionId: string;
  onDone?: (() => void) | undefined;
}) {
  const relist = useRelistAuction();
  const [endTime, setEndTime] = useState("");

  return (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-1">
      <Input
        type="datetime-local"
        aria-label="เวลาปิดประมูลรอบใหม่"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        className="min-h-10 w-full rounded-xl text-xs sm:w-auto sm:flex-1"
      />
      <Button
        variant="secondary"
        disabled={relist.isPending}
        className="min-h-10 flex-1 rounded-xl px-3 text-xs sm:flex-none"
        onClick={() => {
          if (!endTime) {
            toast.error("กรุณาระบุเวลาปิดประมูลรอบใหม่");
            return;
          }
          relist.mutate(
            { auctionId, endTime },
            {
              onSuccess: () => {
                toast.success("เปิดประมูลรอบใหม่แล้ว");
                setEndTime("");
                onDone?.();
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
            },
          );
        }}
      >
        {relist.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Gavel className="h-4 w-4" />
        )}
        เปิดประมูลใหม่
      </Button>
    </div>
  );
}

/** แก้จำนวนสต็อก — การ์ดชิ้นเดียวแบบเดิม (ยังไม่มีสต็อก) ก็ตั้งเพื่อเติมของได้ */
function StockControl({ card, onDone }: { card: AdminCardRow; onDone?: (() => void) | undefined }) {
  const update = useUpdateCardListing();
  const [value, setValue] = useState(
    card.stock_quantity === null ? "" : String(card.stock_quantity),
  );

  useEffect(() => {
    setValue(card.stock_quantity === null ? "" : String(card.stock_quantity));
  }, [card.stock_quantity]);

  const current = card.stock_quantity === null ? "" : String(card.stock_quantity);
  const dirty = value.trim() !== "" && value.trim() !== current;

  const save = () => {
    const n = Number(value);
    if (!Number.isInteger(n) || n < 0 || n > 9999) {
      toast.error("จำนวนสต็อกต้องเป็นจำนวนเต็ม 0 – 9,999");
      return;
    }
    update.mutate(
      { cardId: card.id, stockQuantity: n },
      {
        onSuccess: () => {
          toast.success(
            n > 0 ? `อัปเดตสต็อกเป็น ${n} ชิ้นแล้ว` : "ตั้งสต็อกเป็น 0 — ปิดการซื้อแล้ว",
          );
          onDone?.();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "อัปเดตสต็อกไม่สำเร็จ"),
      },
    );
  };

  return (
    <div className="flex w-full items-center gap-2 sm:w-auto">
      <Input
        type="number"
        min={0}
        max={9999}
        step={1}
        inputMode="numeric"
        aria-label="จำนวนสต็อก"
        placeholder={card.stock_quantity === null ? "ชิ้นเดียว" : undefined}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && dirty) save();
        }}
        className="min-h-10 w-24 rounded-xl text-xs"
      />
      <Button
        variant="secondary"
        disabled={!dirty || update.isPending}
        onClick={save}
        className="min-h-10 rounded-xl px-3 text-xs"
      >
        {update.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Package className="h-4 w-4" />
        )}
        {card.stock_quantity === null || card.stock_quantity === 0 ? "เติมสต็อก" : "บันทึกสต็อก"}
      </Button>
    </div>
  );
}

/** ฉบับร่างของการ์ดประมูล: ตั้งเวลาปิดแล้วกดเปิดประมูล (เริ่มนับเวลาตอนนี้) */
function PublishAuctionDraft({
  cardId,
  onDone,
}: {
  cardId: string;
  onDone?: (() => void) | undefined;
}) {
  const update = useUpdateCardListing();
  const [endTime, setEndTime] = useState("");
  const [increment, setIncrement] = useState("50");

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Input
        type="datetime-local"
        aria-label="วันเวลาปิดประมูล"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        className="min-h-10 w-full rounded-xl text-xs sm:w-auto sm:flex-1"
      />
      <Input
        type="number"
        min={1}
        aria-label="ขั้นต่ำการเคาะ (บาท)"
        title="ขั้นต่ำการเคาะ (บาท)"
        value={increment}
        onChange={(e) => setIncrement(e.target.value)}
        className="min-h-10 w-24 rounded-xl text-xs"
      />
      <Button
        disabled={update.isPending}
        className="min-h-10 flex-1 rounded-xl px-3 text-xs sm:flex-none"
        onClick={() => {
          if (!endTime) {
            toast.error("กรุณาระบุวันเวลาปิดประมูล");
            return;
          }
          update.mutate(
            {
              cardId,
              isPublished: true,
              auctionEndTime: endTime,
              bidIncrement: Number(increment) || 50,
            },
            {
              onSuccess: () => {
                toast.success("เปิดประมูลแล้ว");
                onDone?.();
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
            },
          );
        }}
      >
        {update.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Gavel className="h-4 w-4" />
        )}
        เปิดประมูล
      </Button>
    </div>
  );
}

/** เปลี่ยนหมวดเกมของการ์ดที่ลงไปแล้ว — เลือกแล้วบันทึกทันที */
function CardCategorySelect({
  cardId,
  value,
  onDone,
}: {
  cardId: string;
  value: string | null;
  onDone?: (() => void) | undefined;
}) {
  const { data } = useCategories();
  const setCategory = useSetCardCategory();
  const options = (data ?? []).filter((c) => c.is_active || c.id === value);
  if (options.length === 0) return null;
  return (
    <select
      aria-label="หมวดเกม"
      disabled={setCategory.isPending}
      value={value ?? ""}
      onChange={(e) =>
        setCategory.mutate(
          { cardId, categoryId: e.target.value || null },
          {
            onSuccess: () => {
              toast.success("เปลี่ยนหมวดแล้ว");
              onDone?.();
            },
            onError: (err) => toast.error(err.message),
          },
        )
      }
      className="min-h-10 rounded-xl border border-border bg-card px-3 text-xs font-semibold"
    >
      <option value="">หมวด: ไม่ระบุ</option>
      {options.map((c) => (
        <option key={c.id} value={c.id}>
          หมวด: {c.name}
        </option>
      ))}
    </select>
  );
}
