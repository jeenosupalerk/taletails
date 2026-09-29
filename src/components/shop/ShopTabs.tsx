import { Link } from "@tanstack/react-router";
import { Copy, Loader2, MessageSquareReply, PackageCheck, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RatingBars, ReviewItem } from "@/components/reviews/ReviewBits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import { Textarea } from "@/components/ui/textarea";
import {
  useReplyReview,
  useSaveShopProfile,
  useSellerOrders,
  useSellerShipOrder,
  useShopProfile,
  useShopReviews,
  useShopSummary,
  type SellerOrder,
} from "@/hooks/useShop";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const chip = (on: boolean) =>
  cn(
    "inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-4 text-xs font-semibold transition-colors",
    on
      ? "border-foreground bg-foreground text-background"
      : "border-border bg-card text-muted-foreground hover:text-foreground",
  );

/* =========================== คำสั่งซื้อ =========================== */

type OrderFilter = "paid" | "pending" | "shipped" | "completed";
const ORDER_FILTERS: { key: OrderFilter; label: string }[] = [
  { key: "paid", label: "ต้องจัดส่ง" },
  { key: "pending", label: "รอชำระ" },
  { key: "shipped", label: "ส่งแล้ว" },
  { key: "completed", label: "สำเร็จ" },
];

export function ShopOrdersTab({ sellerId }: { sellerId: string }) {
  const { data, isLoading, error } = useSellerOrders(sellerId);
  const [filter, setFilter] = useState<OrderFilter>("paid");
  const orders = data ?? [];
  const count = (k: OrderFilter) => orders.filter((o) => o.status === k).length;
  const list = orders.filter((o) => o.status === filter);

  return (
    <div className="space-y-4">
      <div
        className="no-scrollbar scroll-fade -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="สถานะคำสั่งซื้อ"
      >
        {ORDER_FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={chip(filter === f.key)}
          >
            {f.label} <span className="tabular-nums opacity-70">{count(f.key)}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          โหลดคำสั่งซื้อไม่สำเร็จ: {error.message}
        </p>
      ) : list.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-12 text-center">
          <PackageCheck className="h-7 w-7 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {filter === "paid" ? "ไม่มีคำสั่งซื้อที่ต้องจัดส่ง" : "ยังไม่มีคำสั่งซื้อในสถานะนี้"}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((o) => (
            <SellerOrderCard key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SellerOrderCard({ order: o }: { order: SellerOrder }) {
  const ship = useSellerShipOrder();
  const [tracking, setTracking] = useState("");
  const [showAddress, setShowAddress] = useState(false);
  const code = o.id.slice(0, 8).toUpperCase();

  const submit = () => {
    if (!tracking.trim()) {
      toast.error("กรอกเลขพัสดุก่อน");
      return;
    }
    ship.mutate(
      { orderId: o.id, tracking: tracking.trim() },
      {
        onSuccess: () => toast.success("ยืนยันจัดส่งแล้ว ลูกค้าได้รับแจ้งเตือน"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const address = [o.shipping_name, o.shipping_phone].filter(Boolean).join(" · ");

  return (
    <li className="rounded-2xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="h-[70px] w-[50px] shrink-0 overflow-hidden rounded-lg bg-tile">
          {o.cards?.images?.[0] && (
            <SmartImage
              src={o.cards.images[0]}
              alt=""
              transformWidth={120}
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="min-w-0 truncate font-semibold">{o.cards?.name ?? "การ์ด"}</p>
            <p className="shrink-0 font-display font-semibold tabular-nums">
              {thb.format(Number(o.total_amount))}
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            #{code}
            {o.paid_at && ` · ชำระ ${dateFmt.format(new Date(o.paid_at))}`}
            {o.shipped_at && ` · ส่ง ${dateFmt.format(new Date(o.shipped_at))}`}
          </p>
          {o.tracking_number && (
            <p className="mt-1 flex items-center gap-1 text-xs">
              <Truck className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-semibold break-all">{o.tracking_number}</span>
              <button
                type="button"
                aria-label="คัดลอกเลขพัสดุ"
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
                onClick={() => {
                  void navigator.clipboard.writeText(o.tracking_number ?? "");
                  toast.success("คัดลอกแล้ว");
                }}
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </p>
          )}
        </div>
      </div>

      {o.status === "paid" && (
        <div className="mt-3 space-y-3">
          <div className="rounded-xl bg-secondary/60 px-3 py-2.5 text-sm">
            <p>
              <span className="font-semibold">ส่งถึง</span> {address || "ยังไม่มีข้อมูลผู้รับ"}
            </p>
            {showAddress ? (
              <p className="mt-1 text-xs leading-relaxed break-words text-muted-foreground">
                {o.shipping_address}
              </p>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddress(true)}
                className="mt-1 min-h-8 text-xs font-semibold text-primary"
              >
                ดูที่อยู่เต็ม
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder="เลขพัสดุ"
              aria-label="เลขพัสดุ"
              className="min-h-11 flex-1 rounded-xl"
            />
            <Button className="min-h-11 rounded-xl" disabled={ship.isPending} onClick={submit}>
              {ship.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Truck className="h-4 w-4" />
              )}
              ยืนยันจัดส่ง
            </Button>
          </div>
        </div>
      )}
      {o.status === "pending" && (
        <p className="mt-3 rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          รอลูกค้าชำระภายใน {dateFmt.format(new Date(o.payment_due_at))}
        </p>
      )}
      {o.status === "shipped" && (
        <p className="mt-3 text-xs text-muted-foreground">
          รอลูกค้ากดรับของ (ระบบยืนยันให้เองหลังส่ง 7 วัน)
        </p>
      )}
    </li>
  );
}

/* ============================== รีวิว ============================== */

export function ShopReviewsTab({ sellerId }: { sellerId: string }) {
  const summary = useShopSummary(sellerId);
  const reviews = useShopReviews(sellerId);
  const [filter, setFilter] = useState<"unreplied" | "all" | "low">("all");
  const list = (reviews.data ?? []).filter((r) =>
    filter === "unreplied" ? !r.seller_reply : filter === "low" ? r.rating <= 3 : true,
  );
  const unreplied = (reviews.data ?? []).filter((r) => !r.seller_reply).length;
  const s = summary.data;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-5 rounded-3xl border border-border bg-card p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4 sm:block sm:text-center">
          <p className="font-display text-5xl leading-none font-bold tabular-nums">
            {s?.avg_rating != null ? s.avg_rating.toFixed(1) : "-"}
          </p>
          <div>
            <p className="mt-1 flex justify-center text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn(
                    "h-4 w-4",
                    i < Math.round(s?.avg_rating ?? 0) ? "fill-current" : "text-border",
                  )}
                />
              ))}
            </p>
            <p className="text-xs text-muted-foreground">{s?.review_count ?? 0} รีวิว</p>
          </div>
        </div>
        <div className="flex-1">
          <RatingBars counts={s?.rating_counts ?? [0, 0, 0, 0, 0]} />
        </div>
        {s && Object.keys(s.tag_counts).length > 0 && (
          <div className="flex flex-wrap gap-1.5 sm:w-56">
            {Object.entries(s.tag_counts)
              .sort((a, b) => b[1] - a[1])
              .map(([tag, n]) => (
                <span
                  key={tag}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium"
                >
                  {tag} {n}
                </span>
              ))}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
          ทั้งหมด
        </button>
        <button
          type="button"
          className={chip(filter === "unreplied")}
          onClick={() => setFilter("unreplied")}
        >
          ยังไม่ตอบ <span className="tabular-nums opacity-70">{unreplied}</span>
        </button>
        <button type="button" className={chip(filter === "low")} onClick={() => setFilter("low")}>
          1-3 ดาว
        </button>
      </div>

      {reviews.isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : list.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          {(reviews.data ?? []).length === 0
            ? "ยังไม่มีรีวิว ลูกค้ารีวิวได้หลังกดยืนยันว่าได้รับสินค้า"
            : "ไม่มีรีวิวในหมวดนี้"}
        </div>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <ReviewItem
                review={r}
                footer={
                  <>
                    {r.is_hidden && (
                      <p className="text-xs font-semibold text-muted-foreground">
                        รีวิวนี้ถูกซ่อนโดยทีมงาน
                      </p>
                    )}
                    {!r.seller_reply && <ReplyBox reviewId={r.id} />}
                  </>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ReplyBox({ reviewId }: { reviewId: string }) {
  const reply = useReplyReview();
  const [text, setText] = useState("");
  const send = () => {
    if (!text.trim()) return;
    reply.mutate(
      { reviewId, reply: text.trim() },
      {
        onSuccess: () => toast.success("ตอบรีวิวแล้ว"),
        onError: (e) => toast.error(e.message),
      },
    );
  };
  return (
    <div className="flex gap-2 pt-1">
      <Input
        value={text}
        maxLength={500}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && send()}
        placeholder="ตอบกลับลูกค้า (ตอบได้ 1 ครั้ง)"
        aria-label="ตอบกลับรีวิว"
        className="min-h-11 flex-1 rounded-xl"
      />
      <Button
        className="min-h-11 rounded-xl"
        disabled={reply.isPending || !text.trim()}
        onClick={send}
      >
        {reply.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MessageSquareReply className="h-4 w-4" />
        )}
        ตอบ
      </Button>
    </div>
  );
}

/* =========================== ตั้งค่าร้าน =========================== */

export function ShopSettingsTab({
  userId,
  fallbackName,
}: {
  userId: string;
  fallbackName: string;
}) {
  const profile = useShopProfile(userId);
  const save = useSaveShopProfile();
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");

  useEffect(() => {
    setName(profile.data?.shop_name ?? fallbackName);
    setDesc(profile.data?.description ?? "");
  }, [profile.data, fallbackName]);

  const submit = () => {
    const shopName = name.trim();
    if (shopName.length < 2 || shopName.length > 40) {
      toast.error("ชื่อร้านต้องยาว 2 ถึง 40 ตัวอักษร");
      return;
    }
    save.mutate(
      { user_id: userId, shop_name: shopName, description: desc.trim() || null },
      {
        onSuccess: () => toast.success("บันทึกข้อมูลร้านแล้ว"),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <section className="max-w-xl space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="space-y-1.5">
        <Label htmlFor="shop-name" className="text-sm font-semibold">
          ชื่อร้าน
        </Label>
        <Input
          id="shop-name"
          value={name}
          maxLength={40}
          onChange={(e) => setName(e.target.value)}
          className="min-h-11 rounded-xl"
        />
        <p className="text-xs text-muted-foreground">แสดงในหน้าสินค้าและรีวิว</p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="shop-desc" className="text-sm font-semibold">
          แนะนำร้าน <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
        </Label>
        <Textarea
          id="shop-desc"
          rows={4}
          maxLength={300}
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="เช่น ขายการ์ดเกรด PSA/SQC ส่งทุกวันจันทร์-ศุกร์ แพ็คกล่องแข็งทุกใบ"
          className="rounded-xl"
        />
        <p className="text-right text-xs text-muted-foreground tabular-nums">{desc.length}/300</p>
      </div>
      <p className="text-xs text-muted-foreground">
        รูปร้านใช้รูปโปรไฟล์ของคุณ เปลี่ยนได้ที่{" "}
        <Link to="/profile" className="font-semibold text-primary">
          หน้าโปรไฟล์
        </Link>
      </p>
      <Button className="min-h-11 rounded-xl" disabled={save.isPending} onClick={submit}>
        {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        บันทึก
      </Button>
    </section>
  );
}
