import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { UserAvatar } from "@/components/site/UserAvatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SmartImage } from "@/components/ui/smart-image";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  maskName,
  RATING_LABEL,
  REVIEW_TAGS,
  uploadReviewImage,
  useMyReviews,
  useShopProfile,
  useShopReviews,
  useShopSummary,
  useSubmitReview,
  type Review,
} from "@/hooks/useShop";
import { cn } from "@/lib/utils";

/** แต้มที่ได้เมื่อรีวิวครั้งแรก — ถ้าแก้ใน tt_settings ต้องแก้ตรงนี้ด้วย */
export const REVIEW_POINTS = 20;

const dateFmt = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "2-digit",
});

/** ดาวแสดงผล (อ่านอย่างเดียว) รองรับครึ่งดาวด้วยการตัดความกว้าง */
export function Stars({ value, className }: { value: number; className?: string | undefined }) {
  return (
    <span
      className={cn("relative inline-flex text-border", className)}
      aria-label={`${value} จาก 5 ดาว`}
      role="img"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-[1em] w-[1em] fill-current" aria-hidden />
      ))}
      <span
        className="absolute inset-0 flex overflow-hidden text-amber-500"
        style={{ width: `${(value / 5) * 100}%` }}
      >
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-[1em] w-[1em] shrink-0 fill-current" aria-hidden />
        ))}
      </span>
    </span>
  );
}

/** รีวิว 1 รายการ (ใช้ในหน้าสินค้า + แท็บรีวิวของร้าน) */
export function ReviewItem({ review, footer }: { review: Review; footer?: React.ReactNode }) {
  const name = maskName(review.buyer?.username);
  return (
    <article className="space-y-2">
      <div className="flex items-center gap-2.5">
        <UserAvatar name={name} src={review.buyer?.avatar_url} className="h-8 w-8" />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-x-2 text-sm">
            <span className="font-semibold">{name}</span>
            <Stars value={review.rating} className="text-sm" />
          </p>
          <p className="truncate text-xs text-muted-foreground">
            ซื้อ {review.card_name} · {dateFmt.format(new Date(review.created_at))}
          </p>
        </div>
      </div>
      {review.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {review.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-medium"
            >
              {t}
            </span>
          ))}
        </div>
      )}
      {review.comment && <p className="text-sm leading-relaxed break-words">{review.comment}</p>}
      {review.images.length > 0 && (
        <div className="flex gap-2">
          {review.images.map((src) => (
            <a
              key={src}
              href={src}
              target="_blank"
              rel="noopener noreferrer"
              className="block h-16 w-16 overflow-hidden rounded-lg bg-tile"
            >
              <SmartImage
                src={src}
                alt="รูปจากผู้รีวิว"
                transformWidth={160}
                className="object-cover"
              />
            </a>
          ))}
        </div>
      )}
      {review.seller_reply && (
        <div className="rounded-xl bg-secondary/70 px-3 py-2 text-sm">
          <span className="font-semibold">ร้านตอบ:</span> {review.seller_reply}
        </div>
      )}
      {footer}
    </article>
  );
}

/** แท่งจำนวนดาว 5 → 1 */
export function RatingBars({ counts }: { counts: number[] }) {
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  return (
    <div className="grid gap-1 text-xs">
      {[5, 4, 3, 2, 1].map((star) => {
        const n = counts[star - 1] ?? 0;
        return (
          <div key={star} className="flex items-center gap-2">
            <span className="w-3 text-right tabular-nums">{star}</span>
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
              <span
                className="block h-full rounded-full bg-amber-500"
                style={{ width: `${(n / total) * 100}%` }}
              />
            </span>
            <span className="w-7 text-muted-foreground tabular-nums">{n}</span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * แผ่นให้คะแนนหลังได้รับสินค้า — ดาว → แท็ก → ข้อความ/รูป (ไม่บังคับ)
 * existing = รีวิวเดิม (แก้ได้ภายใน 30 วัน, ไม่ได้แต้มเพิ่ม)
 */
export function ReviewSheet({
  open,
  onOpenChange,
  orderId,
  cardName,
  cardImage,
  userId,
  existing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  cardName: string;
  cardImage?: string | undefined;
  userId: string;
  existing?: Review | undefined;
}) {
  const isMobile = useIsMobile();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [images, setImages] = useState<string[]>(existing?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const submit = useSubmitReview();
  // ตรงกับ tt_settings.review_points (ตั้งไว้ 20) — get_tt_public_settings ยังไม่ได้ส่งค่านี้ออกมา
  const reward = existing ? 0 : REVIEW_POINTS;

  const toggleTag = (t: string) =>
    setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t]));

  const addImages = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = 3 - images.length;
    if (room <= 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const f of Array.from(files).slice(0, room))
        urls.push(await uploadReviewImage(userId, f));
      setImages((cur) => [...cur, ...urls].slice(0, 3));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const send = () => {
    if (!rating) {
      toast.error("แตะดาวเพื่อให้คะแนนก่อน");
      return;
    }
    submit.mutate(
      { orderId, rating, tags, comment, images },
      {
        onSuccess: () => {
          toast.success(
            existing
              ? "แก้รีวิวแล้ว"
              : reward
                ? `ขอบคุณสำหรับรีวิว ได้รับ ${reward} แต้ม`
                : "ขอบคุณสำหรับรีวิว",
          );
          onOpenChange(false);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "max-h-[92dvh] rounded-t-3xl" : "w-full sm:max-w-md",
        )}
      >
        <SheetHeader className="border-b border-border px-5 pt-5 pb-4 text-left">
          <SheetTitle className="font-display text-lg">
            {existing ? "แก้รีวิว" : "ให้คะแนนร้าน"}
          </SheetTitle>
          <div className="flex items-center gap-3 pt-1">
            <div className="h-14 w-10 shrink-0 overflow-hidden rounded-md bg-tile">
              {cardImage && (
                <SmartImage src={cardImage} alt="" transformWidth={100} className="object-cover" />
              )}
            </div>
            <p className="min-w-0 truncate text-sm font-semibold">{cardName}</p>
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-6">
          <div className="text-center">
            <p className="font-display text-base font-semibold">ได้รับการ์ดเป็นยังไงบ้าง</p>
            <div className="mt-3 flex justify-center gap-1" role="radiogroup" aria-label="คะแนน">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} ดาว`}
                  onClick={() => setRating(n)}
                  className="grid h-12 w-12 place-items-center rounded-xl transition-transform active:scale-90"
                >
                  <Star
                    className={cn(
                      "h-9 w-9",
                      n <= rating ? "fill-amber-500 text-amber-500" : "text-border",
                    )}
                  />
                </button>
              ))}
            </div>
            <p className="mt-1 h-5 text-sm font-semibold">{RATING_LABEL[rating]}</p>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">อะไรที่ประทับใจ (เลือกได้หลายข้อ)</p>
            <div className="flex flex-wrap gap-2">
              {REVIEW_TAGS.map((t) => {
                const on = tags.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleTag(t)}
                    className={cn(
                      "min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors",
                      on
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="review-comment" className="mb-2 block text-sm font-semibold">
              เล่าเพิ่ม <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
            </label>
            <Textarea
              id="review-comment"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="เช่น สภาพการ์ด การแพ็ค ความเร็วในการส่ง"
              className="rounded-xl"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">
              รูปการ์ดที่ได้รับ{" "}
              <span className="font-normal text-muted-foreground">(สูงสุด 3 รูป)</span>
            </p>
            <div className="flex gap-2">
              {images.map((src) => (
                <div key={src} className="relative h-16 w-16 overflow-hidden rounded-xl bg-tile">
                  <SmartImage src={src} alt="" transformWidth={160} className="object-cover" />
                  <button
                    type="button"
                    aria-label="เอารูปออก"
                    onClick={() => setImages((cur) => cur.filter((x) => x !== src))}
                    className="absolute top-0.5 right-0.5 grid h-6 w-6 place-items-center rounded-full bg-foreground/70 text-background"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
              {images.length < 3 && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="grid h-16 w-16 place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground"
                  aria-label="เพิ่มรูป"
                >
                  {uploading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <ImagePlus className="h-5 w-5" />
                  )}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  void addImages(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-border px-5 py-4">
          <Button
            className="min-h-12 w-full rounded-xl text-base"
            disabled={submit.isPending || uploading}
            onClick={send}
          >
            {submit.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {existing ? "บันทึกการแก้ไข" : reward ? `ส่งรีวิว · รับ ${reward} แต้ม` : "ส่งรีวิว"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * ปุ่ม "ให้คะแนน" / "แก้รีวิว" ของคำสั่งซื้อที่สำเร็จแล้ว (หน้าสถานะการซื้อ)
 * รีวิวแล้ว → โชว์ดาวที่ให้ไว้ + แก้ได้ภายใน 30 วัน
 */
export function OrderReviewButton({
  orderId,
  cardName,
  cardImage,
  userId,
  className,
}: {
  orderId: string;
  cardName: string;
  cardImage?: string | undefined;
  userId: string;
  className?: string | undefined;
}) {
  const [open, setOpen] = useState(false);
  const mine = useMyReviews(userId);
  const existing = mine.data?.find((r) => r.order_id === orderId);
  const editable =
    !!existing && Date.now() - new Date(existing.created_at).getTime() < 30 * 86_400_000;
  if (mine.isLoading) return null;

  return (
    <>
      {existing ? (
        <div
          className={cn(
            "flex items-center justify-between gap-2 rounded-xl bg-secondary/60 px-3 py-2",
            className,
          )}
        >
          <span className="flex items-center gap-2 text-sm">
            รีวิวแล้ว <Stars value={existing.rating} className="text-sm" />
          </span>
          {editable && (
            <Button
              variant="ghost"
              className="min-h-10 rounded-xl px-3 text-xs"
              onClick={() => setOpen(true)}
            >
              แก้รีวิว
            </Button>
          )}
        </div>
      ) : (
        <Button
          className={cn("min-h-11 w-full rounded-xl font-semibold", className)}
          onClick={() => setOpen(true)}
        >
          <Star className="h-4 w-4" /> ให้คะแนนร้าน · รับ {REVIEW_POINTS} แต้ม
        </Button>
      )}
      {open && (
        <ReviewSheet
          open={open}
          onOpenChange={setOpen}
          orderId={orderId}
          cardName={cardName}
          cardImage={cardImage}
          userId={userId}
          existing={existing}
        />
      )}
    </>
  );
}

/**
 * ส่วน "ผู้ขาย + รีวิวร้าน" ในหน้าสินค้า — รีวิวผูกกับร้าน (คนขายคนเดียวกัน) ไม่ใช่การ์ดใบเดียว
 * เพราะการ์ดส่วนใหญ่มีชิ้นเดียว รีวิวรายใบแทบไม่มี แต่ความน่าเชื่อถือของร้านคือสิ่งที่ลูกค้าอยากรู้
 */
export function SellerReviews({
  sellerId,
  fallbackName,
}: {
  sellerId: string;
  fallbackName: string;
}) {
  const [showAll, setShowAll] = useState(false);
  const profile = useShopProfile(sellerId);
  const summary = useShopSummary(sellerId);
  const reviews = useShopReviews(sellerId, 20);
  const s = summary.data;
  const name = profile.data?.shop_name || fallbackName;
  const visible = (reviews.data ?? []).filter((r) => !r.is_hidden);
  const list = showAll ? visible : visible.slice(0, 3);
  const topTags = Object.entries(s?.tag_counts ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  return (
    <section className="surface-panel mt-4 space-y-4 p-4" aria-label="ผู้ขายและรีวิวร้าน">
      <div className="flex items-center gap-3">
        <UserAvatar name={name} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{name}</p>
          <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
            {s && s.review_count > 0 ? (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <b className="text-foreground">{s.avg_rating?.toFixed(1)}</b> ({s.review_count}{" "}
                รีวิว)
              </span>
            ) : (
              <span>ร้านใหม่ ยังไม่มีรีวิว</span>
            )}
            {s && s.sold_count > 0 && <span>ขายแล้ว {s.sold_count} ชิ้น</span>}
          </p>
        </div>
      </div>
      {profile.data?.description && (
        <p className="text-sm leading-relaxed break-words text-muted-foreground">
          {profile.data.description}
        </p>
      )}

      {visible.length > 0 && (
        <>
          {topTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {topTags.map(([tag, n]) => (
                <span
                  key={tag}
                  className="rounded-full border border-border px-2.5 py-1 text-[11px] font-medium"
                >
                  {tag} {n}
                </span>
              ))}
            </div>
          )}
          <ul className="space-y-4 border-t border-border pt-4">
            {list.map((r) => (
              <li key={r.id}>
                <ReviewItem review={r} />
              </li>
            ))}
          </ul>
          {visible.length > 3 && !showAll && (
            <Button
              variant="secondary"
              className="min-h-11 w-full rounded-xl"
              onClick={() => setShowAll(true)}
            >
              ดูรีวิวทั้งหมด {s?.review_count ?? visible.length}
            </Button>
          )}
        </>
      )}
    </section>
  );
}
