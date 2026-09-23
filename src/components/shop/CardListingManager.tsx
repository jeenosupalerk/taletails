import { Link } from "@tanstack/react-router";
import {
  AlarmClock,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Gavel,
  ImagePlus,
  Loader2,
  Lock,
  Package,
  PackageOpen,
  Plus,
  Save,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useAdminCards,
  useCreateCard,
  useDeleteCard,
  useMyCards,
  useRelistAuction,
  useUpdateAuctionEndTime,
  useUpdateCardListing,
  type AdminCardRow,
  type NewCardInput,
} from "@/hooks/useAdmin";
import { isSoldExpiredFromMarket, SOLD_VISIBLE_DAYS } from "@/hooks/useSupabaseCatalog";
import {
  getAuctionOutcome,
  type AuctionDbStatus,
  type CardDbStatus,
} from "@/lib/auction-status";

import { thb } from "@/lib/cart";

import { SmartImage } from "@/components/ui/smart-image";
import { ImagePicker, MAX_IMAGES } from "@/components/shop/ImagePicker";
import { EditImagesButton } from "@/components/shop/EditImagesDialog";
import { GradingCompanyField } from "@/components/shop/GradingCompanyField";
import { SuggestInput } from "@/components/shop/SuggestInput";
import { useCardSuggestions } from "@/hooks/useCardSuggestions";

const EMPTY: NewCardInput = {
  name: "",
  setName: "",
  cardNo: "",
  language: "",
  rarity: "",
  year: "",
  condition: "",
  grade: "",
  gradingCompany: "",
  certificationNo: "",
  details: "",
  saleType: "fixed_price",
  price: "",
  startingPrice: "",
  bidIncrement: "50",
  endTime: "",
  stockQuantity: "1",
  files: [],
  publish: true,
};

const PAGE_SIZE = 8;

const STATUS_LABEL: Record<string, string> = {
  available: "พร้อมขาย",
  locked: "ถูกจอง",
  sold: "ขายแล้ว",
};

export function CardListingManager({ scope = "admin" }: { scope?: "admin" | "shop" }) {
  const [form, setForm] = useState<NewCardInput>(EMPTY);
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const adminCards = useAdminCards(scope === "admin");
  const myCards = useMyCards(scope === "shop");
  const cards = scope === "shop" ? myCards : adminCards;
  const create = useCreateCard();
  // ชื่อการ์ด/ชุดที่เคยลงไว้ — ช่วยให้พิมพ์ตรงกันทุกครั้ง ราคากลางจะได้รวมเป็นรุ่นเดียวกัน
  const suggest = useCardSuggestions(open);
  const nameItems = useMemo(
    () =>
      suggest.cards.map((c) => ({
        key: `${c.name}|${c.setName}|${c.cardNo}`,
        text: c.name,
        detail: [c.setName, c.cardNo && `#${c.cardNo}`, `ลงแล้ว ${c.count} ใบ`].filter(Boolean).join(" · "),
        weight: c.count,
        value: c,
      })),
    [suggest.cards],
  );
  const setItems = useMemo(
    () =>
      suggest.sets.map((x) => ({
        key: x.setName,
        text: x.setName,
        detail: `ลงแล้ว ${x.count} ใบ`,
        weight: x.count,
        value: x.setName,
      })),
    [suggest.sets],
  );
  const del = useDeleteCard();
  const setEnd = useUpdateAuctionEndTime();

  // นับเวลาเพื่อให้ปุ่ม "เปิดประมูลใหม่" โผล่ทันทีเมื่อเลยกำหนดชำระเงิน
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, []);


  const items = cards.data ?? [];
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageItems = items.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const onRowKeyDown = (e: React.KeyboardEvent<HTMLLIElement>) => {
    // ไม่รับคีย์ลัดที่ bubble มาจาก dialog (portal) เช่น หน้าแก้ไขรูป/ครอบรูป
    if (!e.currentTarget.contains(e.target as Node)) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
    const key = e.key.toLowerCase();
    if (key === "v") {
      e.currentTarget.querySelector<HTMLElement>('[data-action="view"]')?.click();
    } else if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      e.currentTarget.querySelector<HTMLElement>('[data-action="delete"]')?.click();
    }
  };

  const set = <K extends keyof NewCardInput>(key: K, value: NewCardInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  /** publish = true ลงตลาดทันที / false บันทึกเป็นฉบับร่าง (ยังไม่แสดงในตลาด) */
  const submit = (publish: boolean) => {
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อการ์ด");
      return;
    }
    if (form.saleType === "fixed_price" && !Number(form.price)) {
      toast.error("กรุณากรอกราคาขาย");
      return;
    }
    if (form.saleType === "fixed_price") {
      const stock = Number(form.stockQuantity);
      if (!Number.isInteger(stock) || stock < 1 || stock > 9999) {
        toast.error("จำนวนสต็อกต้องเป็นจำนวนเต็ม 1 – 9,999");
        return;
      }
    }
    if (publish && form.saleType === "auction" && !form.endTime) {
      toast.error("กรุณาระบุวันเวลาปิดประมูล");
      return;
    }

    setSubmitting(publish ? "publish" : "draft");
    create.mutate({ ...form, publish }, {
      onSettled: () => setSubmitting(null),
      onSuccess: () => {
        toast.success(publish ? "ลงการ์ดในตลาดเรียบร้อย" : "บันทึกฉบับร่างแล้ว ยังไม่แสดงในตลาด");
        setForm(EMPTY);
        setOpen(false);
      },
      onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">
          {scope === "shop" ? "สินค้าในร้านของฉัน" : "การ์ดในระบบ"}
        </h2>
        <Button className="min-h-11 rounded-xl" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" />
          ลงการ์ดใหม่
        </Button>
      </div>

      {open && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_30px_70px_-60px_rgba(0,0,0,0.7)] sm:p-6">
          <h3 className="font-display text-base font-semibold">รายละเอียดการ์ด</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อการ์ด *">
              <SuggestInput
                value={form.name}
                onChange={(v) => set("name", v)}
                placeholder="พิมพ์ชื่อการ์ด เช่น Moltres V"
                items={nameItems}
                similar={suggest.similarName(form.name)}
                onPick={(it) =>
                  // เลือกการ์ดที่เคยลง → เติมชื่อ + ชุด และช่องที่ยังว่าง (เลขการ์ด/ความหายาก/ภาษา/ปี)
                  setForm((f) => ({
                    ...f,
                    name: it.value.name,
                    setName: it.value.setName || f.setName,
                    cardNo: f.cardNo || it.value.cardNo,
                    rarity: f.rarity || it.value.rarity,
                    language: f.language || it.value.language,
                    year: f.year || it.value.year,
                  }))
                }
              />
            </Field>
            <Field label="ชุด / เซ็ต">
              <SuggestInput
                value={form.setName}
                onChange={(v) => set("setName", v)}
                placeholder="พิมพ์ชื่อชุด"
                items={setItems}
                similar={suggest.similarSet(form.setName)}
                onPick={(it) => set("setName", it.value)}
              />
            </Field>
            <Field label="เลขการ์ด">
              <Input
                className="min-h-11 rounded-xl"
                value={form.cardNo}
                onChange={(e) => set("cardNo", e.target.value)}
              />
            </Field>
            <Field label="ภาษา">
              <Input
                className="min-h-11 rounded-xl"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              />
            </Field>
            <Field label="ความหายาก">
              <Input
                className="min-h-11 rounded-xl"
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value)}
              />
            </Field>
            <Field label="ปี">
              <Input
                type="number"
                className="min-h-11 rounded-xl"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </Field>
            <Field label="สภาพ">
              <Input
                className="min-h-11 rounded-xl"
                placeholder="Near Mint"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              />
            </Field>
            <Field label="บริษัทเกรด">
              <GradingCompanyField
                key={open ? "open" : "closed"}
                value={form.gradingCompany}
                onChange={(v) => set("gradingCompany", v)}
              />
            </Field>
            <Field label="เกรด">
              <Input
                className="min-h-11 rounded-xl"
                placeholder={form.gradingCompany ? "เช่น 10 หรือ 9.5" : "ไม่เกรด — เว้นว่างได้"}
                value={form.grade}
                onChange={(e) => set("grade", e.target.value)}
              />
            </Field>
            <Field label="เลขใบรับรอง">
              <Input
                className="min-h-11 rounded-xl"
                value={form.certificationNo}
                onChange={(e) => set("certificationNo", e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field label="รายละเอียดเพิ่มเติม">
              <Textarea
                rows={3}
                className="rounded-xl"
                value={form.details}
                onChange={(e) => set("details", e.target.value)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Label className="text-xs font-medium text-muted-foreground">
              รูปการ์ด (สูงสุด {MAX_IMAGES} รูป · รูปแรกคือรูปปก)
            </Label>
            <ImagePicker files={form.files} onChange={(files) => set("files", files)} />
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="รูปแบบการขาย">
              <Select
                value={form.saleType}
                onValueChange={(v) => set("saleType", v as "auction" | "fixed_price")}
              >
                <SelectTrigger className="min-h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">ขายราคาปกติ</SelectItem>
                  <SelectItem value="auction">เปิดประมูล</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {form.saleType === "fixed_price" ? (
              <>
                <Field label="ราคาขาย (บาท) *">
                  <Input
                    type="number"
                    className="min-h-11 rounded-xl"
                    value={form.price}
                    onChange={(e) => set("price", e.target.value)}
                  />
                </Field>
                <Field label="จำนวนสต็อก (ชิ้น) *">
                  <Input
                    type="number"
                    min={1}
                    max={9999}
                    step={1}
                    className="min-h-11 rounded-xl"
                    value={form.stockQuantity}
                    onChange={(e) => set("stockQuantity", e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    ระบบตัดสต็อกให้อัตโนมัติเมื่อมีคนซื้อ พอเหลือ 0 ปุ่มซื้อจะปิดเอง
                  </p>
                </Field>
              </>
            ) : (
              <>
                <Field label="ราคาเริ่มต้น (บาท)">
                  <Input
                    type="number"
                    className="min-h-11 rounded-xl"
                    value={form.startingPrice}
                    onChange={(e) => set("startingPrice", e.target.value)}
                  />
                </Field>
                <Field label="ขั้นต่ำการเคาะ (บาท)">
                  <Input
                    type="number"
                    className="min-h-11 rounded-xl"
                    value={form.bidIncrement}
                    onChange={(e) => set("bidIncrement", e.target.value)}
                  />
                </Field>
                <Field label="วันเวลาปิดประมูล * (ไม่ต้องใส่ถ้าบันทึกฉบับร่าง)">
                  <Input
                    type="datetime-local"
                    className="min-h-11 rounded-xl"
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              className="min-h-11 rounded-xl"
              disabled={create.isPending}
              onClick={() => submit(true)}
            >
              {submitting === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.saleType === "auction" ? "ลงการ์ดและเปิดประมูล" : "ลงขายในตลาด"}
            </Button>
            <Button
              variant="secondary"
              className="min-h-11 rounded-xl"
              disabled={create.isPending}
              onClick={() => submit(false)}
              title="เก็บไว้ในร้านก่อน ยังไม่แสดงในตลาด"
            >
              {submitting === "draft" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              บันทึกฉบับร่าง
            </Button>
            <Button variant="ghost" className="min-h-11 rounded-xl" onClick={() => setOpen(false)}>
              ยกเลิก
            </Button>
          </div>
        </section>
      )}

      {cards.isLoading ? (
        <ul className="space-y-3" aria-busy="true" aria-label="กำลังโหลดรายการสินค้า">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
              <div className="flex items-start gap-3">
                <Skeleton className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                  <div className="flex gap-1.5 pt-1">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                </div>
                <Skeleton className="h-4 w-16 shrink-0" />
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed border-border pt-3">
                <Skeleton className="min-h-10 flex-1 rounded-xl" />
                <Skeleton className="min-h-10 w-10 rounded-xl" />
              </div>
            </li>
          ))}
        </ul>
      ) : total === 0 ? (
        <section className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-muted-foreground">
            <PackageOpen className="h-6 w-6" />
          </span>
          <h3 className="font-display text-base font-semibold">
            {scope === "shop" ? "ยังไม่มีสินค้าในร้านของคุณ" : "ยังไม่มีการ์ดในระบบ"}
          </h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            เริ่มต้นด้วยการลงการ์ดใบแรก เลือกได้ว่าจะขายราคาปกติหรือเปิดประมูล
          </p>
          <Button className="min-h-11 rounded-xl" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            สร้างรายการใหม่
          </Button>
        </section>
      ) : (
        <>
        <p className="text-xs text-muted-foreground">
          เลือกการ์ดด้วยปุ่ม Tab แล้วกด <kbd className="rounded bg-secondary px-1.5 py-0.5">V</kbd> เพื่อดูหน้าขาย หรือ{" "}
          <kbd className="rounded bg-secondary px-1.5 py-0.5">Delete</kbd> เพื่อลบ
        </p>
        <ul className="space-y-3">
          {pageItems.map((c) => {
            const auction = c.auctions?.[0];
            const outcome = auction
              ? getAuctionOutcome(
                  auction.status as AuctionDbStatus,
                  c.status as CardDbStatus,
                  auction.end_time,
                  Number(auction.bid_count ?? 0),
                )
              : null;

            // ผู้ชนะไม่ชำระเงินภายในเวลาที่กำหนด -> เปิดให้แอดมินเปิดประมูลใหม่ได้
            const overdueOrder = (c.orders ?? []).some(
              (o) => o.status === "pending" && new Date(o.payment_due_at).getTime() <= now,
            );
            // ลูกค้ากำลังดำเนินการชำระเงิน -> ห้ามลบในช่วงนี้
            const paymentInProgress = (c.orders ?? []).some(
              (o) => o.status === "pending" && new Date(o.payment_due_at).getTime() > now,
            );
            const paymentOverdue =
              c.status !== "sold" &&
              outcome?.outcome === "waiting_payment" &&
              (overdueOrder ||
                (c.orders ?? []).every((o) => o.status === "cancelled"));

            // ล็อกการจัดการเมื่อรอผู้ชนะชำระเงิน หรือประมูลสำเร็จแล้ว
            const managementLocked =
              c.status === "sold" ||
              (!paymentOverdue &&
                ((outcome
                  ? outcome.outcome === "waiting_payment" || outcome.outcome === "completed"
                  : false) ||
                  (!!auction && c.status === "locked")));
            const lockedNote =
              c.sale_type === "fixed_price"
                ? "ขายหมดแล้ว • เติมสต็อกเพื่อเปิดขายต่อได้เลย ไม่ต้องลงใหม่"
                : c.status === "sold" || outcome?.outcome === "completed"
                  ? "ประมูลสำเร็จแล้ว ไม่สามารถแก้ไขหรือเปิดประมูลใหม่ได้"
                  : "อยู่ระหว่างรอผู้ชนะชำระเงิน ไม่สามารถแก้ไขหรือเปิดประมูลใหม่ได้";
            const isDraftAuction = c.sale_type === "auction" && !auction && !c.is_published;
            const expiredFromMarket =
              c.sale_type === "fixed_price" &&
              c.is_published &&
              isSoldExpiredFromMarket(c.status, c.updated_at);

            return (
              <li
                key={c.id}
                tabIndex={0}
                onKeyDown={onRowKeyDown}
                className="rounded-2xl border border-border bg-card p-3 outline-none transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {c.images?.[0] && (
                      <SmartImage src={c.images[0]} alt={c.name} transformWidth={160} className="object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{c.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[c.set_name, c.grade, c.condition].filter(Boolean).join(" • ") || "—"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                        {c.sale_type === "auction" ? (
                          <Gavel className="h-3 w-3" />
                        ) : (
                          <Tag className="h-3 w-3" />
                        )}
                        {c.sale_type === "auction" ? "ประมูล" : "ราคาปกติ"}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                        {STATUS_LABEL[c.status]}
                      </span>
                      {c.sale_type === "fixed_price" && c.stock_quantity !== null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                            c.stock_quantity > 0
                              ? "bg-secondary text-muted-foreground"
                              : "bg-destructive/10 text-destructive"
                          }`}
                        >
                          <Package className="h-3 w-3" />
                          สต็อก {c.stock_quantity}
                        </span>
                      )}
                      {!c.is_published && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-600 dark:text-amber-400">
                          <EyeOff className="h-3 w-3" />
                          {isDraftAuction ? "ฉบับร่าง • ยังไม่เปิดประมูล" : "ฉบับร่าง / ไม่แสดงในตลาด"}
                        </span>
                      )}
                      {expiredFromMarket && (
                        <span
                          className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground"
                          title={`ขายหมดและไม่มีการอัปเดตเกิน ${SOLD_VISIBLE_DAYS} วัน จึงไม่แสดงในหน้าตลาดแล้ว (ยังอยู่ในร้านของคุณ) — เติมสต็อกเพื่อกลับขึ้นตลาด`}
                        >
                          <EyeOff className="h-3 w-3" />
                          ขายหมดเกิน {SOLD_VISIBLE_DAYS} วัน • หายจากตลาดแล้ว
                        </span>
                      )}
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-sm font-semibold">
                    {thb.format(auction?.current_price ?? c.price)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
                  {auction && !managementLocked && (
                    <Input
                      type="datetime-local"
                      aria-label="แก้เวลาปิดประมูล"
                      defaultValue={new Date(auction.end_time).toISOString().slice(0, 16)}
                      onBlur={(e) =>
                        e.target.value &&
                        setEnd.mutate(
                          { auctionId: auction.id, endTime: e.target.value },
                          {
                            onSuccess: () => toast.success("อัปเดตเวลาปิดประมูลแล้ว"),
                            onError: (err) =>
                              toast.error(err instanceof Error ? err.message : "ไม่สำเร็จ"),
                          },
                        )
                      }
                      className="min-h-10 w-full rounded-xl text-xs sm:w-auto sm:flex-1"
                    />
                  )}

                  {c.sale_type === "fixed_price" && <StockControl card={c} />}
                  {c.sale_type === "fixed_price" && <PublishToggle card={c} />}
                  {isDraftAuction && <PublishAuctionDraft cardId={c.id} />}

                  <Button
                    asChild
                    variant="secondary"
                    className="min-h-10 flex-1 rounded-xl px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:flex-none"
                  >
                    {/* เปิดหน้าเดียวกับที่ลูกค้าเห็น: ขายราคาตายตัว = /product, ประมูล = /card */}
                    <Link
                      to={c.sale_type === "fixed_price" ? "/product/$id" : "/card/$id"}
                      params={{ id: c.id }}
                      data-action="view"
                      title="ดูหน้าขาย (V)"
                    >
                      ดูหน้าขาย
                    </Link>
                  </Button>
                  {/* การ์ดที่ขายหมดเกิน 14 วัน: แก้รูปแล้ว updated_at จะเปลี่ยน ทำให้กลับขึ้นตลาด → ซ่อนปุ่ม */}
                  {!expiredFromMarket && (
                    <EditImagesButton cardId={c.id} cardName={c.name} images={c.images ?? []} />
                  )}
                  {paymentOverdue && (
                    <span className="inline-flex min-h-10 w-full items-center gap-1.5 rounded-xl bg-destructive/10 px-3 text-xs font-medium text-destructive sm:w-auto">
                      <AlarmClock className="h-3.5 w-3.5" />
                      ผู้ชนะไม่ชำระเงินตามเวลา • เปิดประมูลใหม่ได้
                    </span>
                  )}
                  {scope === "admin" &&
                    auction &&
                    !managementLocked &&
                    auction.status !== "active" && <RelistAuctionControl auctionId={auction.id} />}
                  {paymentInProgress ? (
                    <span className="inline-flex min-h-10 w-full items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs text-muted-foreground sm:w-auto">
                      <Lock className="h-3.5 w-3.5" />
                      ลูกค้ากำลังชำระเงิน • ยังลบไม่ได้
                    </span>
                  ) : (
                    <ConfirmDialog
                      title="ยืนยันการลบการ์ด"
                      description={`ต้องการลบ "${c.name}" ออกจากร้านหรือไม่? รายการจะยังคงอยู่ในประวัติการลงขายพร้อมสถานะล่าสุด`}
                      confirmLabel="ลบการ์ด"
                      tone="destructive"
                      onConfirm={() =>
                        del.mutate(c.id, {
                          onSuccess: () => toast.success("ลบการ์ดแล้ว"),
                          onError: (e) =>
                            toast.error(e instanceof Error ? e.message : "ลบไม่สำเร็จ"),
                        })
                      }
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="ลบการ์ด"
                          title="ลบการ์ด (Delete)"
                          data-action="delete"
                          className="min-h-10 w-10 shrink-0 rounded-xl text-destructive focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                  {managementLocked && (
                    <span className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-secondary px-3 text-xs text-muted-foreground">
                      <Lock className="h-3.5 w-3.5" />
                      {lockedNote}
                    </span>
                  )}

                </div>
              </li>
            );
          })}
        </ul>

        {pageCount > 1 && (
          <nav className="flex items-center justify-between gap-2" aria-label="แบ่งหน้ารายการสินค้า">
            <Button
              variant="secondary"
              className="min-h-10 rounded-xl px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              disabled={safePage === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              ก่อนหน้า
            </Button>
            <span className="text-xs text-muted-foreground">
              หน้า {safePage} / {pageCount} • ทั้งหมด {total} รายการ
            </span>
            <Button
              variant="secondary"
              className="min-h-10 rounded-xl px-3 text-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

/** ปุ่มเปิดประมูลใหม่ สำหรับรอบที่ผู้ชนะไม่ชำระเงินหรือปิดไปแล้ว */
function RelistAuctionControl({ auctionId }: { auctionId: string }) {
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
              },
              onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
            },
          );
        }}
      >
        {relist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
        เปิดประมูลใหม่
      </Button>
    </div>
  );
}

/** แก้จำนวนสต็อก — การ์ดชิ้นเดียวแบบเดิม (ยังไม่มีสต็อก) ก็ตั้งเพื่อเติมของได้ */
function StockControl({ card }: { card: AdminCardRow }) {
  const update = useUpdateCardListing();
  const [value, setValue] = useState(card.stock_quantity === null ? "" : String(card.stock_quantity));

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
        onSuccess: () =>
          toast.success(n > 0 ? `อัปเดตสต็อกเป็น ${n} ชิ้นแล้ว` : "ตั้งสต็อกเป็น 0 — ปิดการซื้อแล้ว"),
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
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
        {card.stock_quantity === null || card.stock_quantity === 0 ? "เติมสต็อก" : "บันทึกสต็อก"}
      </Button>
    </div>
  );
}

/** ปุ่มเอาขึ้นตลาด / เอาลงจากตลาด (สินค้าขายราคาปกติ) */
function PublishToggle({ card }: { card: AdminCardRow }) {
  const update = useUpdateCardListing();
  const next = !card.is_published;

  return (
    <Button
      variant={card.is_published ? "ghost" : "default"}
      disabled={update.isPending}
      onClick={() =>
        update.mutate(
          { cardId: card.id, isPublished: next },
          {
            onSuccess: () =>
              toast.success(next ? "นำสินค้าขึ้นตลาดแล้ว" : "ซ่อนสินค้าจากตลาดแล้ว (ยังอยู่ในร้านของคุณ)"),
            onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
          },
        )
      }
      className="min-h-10 flex-1 rounded-xl px-3 text-xs sm:flex-none"
    >
      {update.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : card.is_published ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {card.is_published ? "เอาลงจากตลาด" : "ลงตลาด"}
    </Button>
  );
}

/** ฉบับร่างของการ์ดประมูล: ตั้งเวลาปิดแล้วกดเปิดประมูล (เริ่มนับเวลาตอนนี้) */
function PublishAuctionDraft({ cardId }: { cardId: string }) {
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
              onSuccess: () => toast.success("เปิดประมูลแล้ว"),
              onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
            },
          );
        }}
      >
        {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gavel className="h-4 w-4" />}
        เปิดประมูล
      </Button>
    </div>
  );
}
