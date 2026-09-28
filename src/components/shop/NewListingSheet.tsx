import { ChevronDown, Gavel, Loader2, Save, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { GradingCompanyField } from "@/components/shop/GradingCompanyField";
import { ImagePicker, MAX_IMAGES } from "@/components/shop/ImagePicker";
import { SuggestInput } from "@/components/shop/SuggestInput";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import { useCreateCard, type NewCardInput } from "@/hooks/useAdmin";
import { useCardSuggestions } from "@/hooks/useCardSuggestions";
import { useCategories } from "@/hooks/useSiteContent";
import { cn } from "@/lib/utils";

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
  startTime: "",
  categoryId: "",
  stockQuantity: "1",
  files: [],
  publish: true,
};

const STEPS = ["รูปการ์ด", "ข้อมูลการ์ด", "วิธีขาย + ราคา"] as const;
const FIELD = "min-h-11 rounded-xl";

/**
 * ฟอร์มลงการ์ดแบบ 3 ขั้น (แผงด้านขวา / เต็มจอบนมือถือ)
 * เดิมเป็นช่องยาว 18 ช่องหน้าเดียว — แบ่งขั้นให้ผู้ขายใหม่ไม่หลง และพับช่องที่ไม่บังคับเก็บไว้
 */
export function NewListingSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [form, setForm] = useState<NewCardInput>(EMPTY);
  const [step, setStep] = useState(0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [submitting, setSubmitting] = useState<"publish" | "draft" | null>(null);
  const create = useCreateCard();
  const categoryOptions = (useCategories().data ?? []).filter((c) => c.is_active);

  // ชื่อการ์ด/ชุดที่เคยลงไว้ — ช่วยให้พิมพ์ตรงกันทุกครั้ง ราคากลางจะได้รวมเป็นรุ่นเดียวกัน
  const suggest = useCardSuggestions(open);
  const nameItems = useMemo(
    () =>
      suggest.cards.map((c) => ({
        key: `${c.name}|${c.setName}|${c.cardNo}`,
        text: c.name,
        detail: [c.setName, c.cardNo && `#${c.cardNo}`, `ลงแล้ว ${c.count} ใบ`]
          .filter(Boolean)
          .join(" · "),
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

  const set = <K extends keyof NewCardInput>(key: K, value: NewCardInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const reset = () => {
    setForm(EMPTY);
    setStep(0);
    setMoreOpen(false);
  };

  /** ตรวจเฉพาะขั้นที่กำลังจะออก — คืน false ถ้าไปต่อไม่ได้ */
  const validateStep = (s: number) => {
    if (s === 1 && !form.name.trim()) {
      toast.error("กรุณากรอกชื่อการ์ด");
      return false;
    }
    return true;
  };

  const submit = (publish: boolean) => {
    if (!validateStep(1)) {
      setStep(1);
      return;
    }
    if (publish && form.files.length === 0) {
      toast.error("ใส่รูปการ์ดอย่างน้อย 1 รูปก่อนลงขาย");
      setStep(0);
      return;
    }
    if (form.saleType === "fixed_price") {
      if (!Number(form.price)) {
        toast.error("กรุณากรอกราคาขาย");
        return;
      }
      const stock = Number(form.stockQuantity);
      if (!Number.isInteger(stock) || stock < 1 || stock > 9999) {
        toast.error("จำนวนสต็อกต้องเป็นจำนวนเต็ม 1 ถึง 9,999");
        return;
      }
    }
    if (publish && form.saleType === "auction" && !form.endTime) {
      toast.error("กรุณาระบุวันเวลาปิดประมูล");
      return;
    }
    if (
      form.saleType === "auction" &&
      form.startTime &&
      form.endTime &&
      new Date(form.startTime) >= new Date(form.endTime)
    ) {
      toast.error("เวลาเริ่มประมูลต้องก่อนเวลาปิดประมูล");
      return;
    }

    setSubmitting(publish ? "publish" : "draft");
    create.mutate(
      { ...form, publish },
      {
        onSettled: () => setSubmitting(null),
        onSuccess: () => {
          toast.success(publish ? "ลงการ์ดเรียบร้อย" : "บันทึกร่างแล้ว ยังไม่แสดงในตลาด");
          reset();
          onOpenChange(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
      },
    );
  };

  const last = step === STEPS.length - 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        // ไม่ปิดทิ้งเมื่อคลิกนอกแผง — กันข้อมูลที่กรอกค้างหาย (ปิดได้ด้วยปุ่ม X)
        onInteractOutside={(e) => e.preventDefault()}
        className={cn(
          "flex flex-col gap-0 p-0",
          isMobile ? "h-[94dvh] rounded-t-3xl" : "w-full sm:max-w-xl",
        )}
      >
        <SheetHeader className="space-y-3 border-b border-border px-5 pt-5 pb-4 text-left sm:px-6">
          <SheetTitle className="font-display text-lg">ลงการ์ดใหม่</SheetTitle>
          <ol className="grid grid-cols-3 gap-2" aria-label="ขั้นตอน">
            {STEPS.map((label, i) => (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => (i < step || validateStep(step)) && setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className="w-full text-left"
                >
                  <span
                    className={cn("block h-1 rounded-full", i <= step ? "bg-primary" : "bg-border")}
                  />
                  <span
                    className={cn(
                      "mt-1.5 block truncate text-xs",
                      i === step ? "font-semibold text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {i + 1}. {label}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {step === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                รูปแรกคือรูปปก ใส่ได้สูงสุด {MAX_IMAGES} รูป แนะนำให้มีด้านหลังการ์ดด้วย
              </p>
              <ImagePicker files={form.files} onChange={(files) => set("files", files)} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="ชื่อการ์ด *">
                <SuggestInput
                  value={form.name}
                  onChange={(v) => set("name", v)}
                  placeholder="พิมพ์ชื่อการ์ด เช่น Moltres V"
                  items={nameItems}
                  similar={suggest.similarName(form.name)}
                  onPick={(it) =>
                    // เลือกการ์ดที่เคยลง → เติมชื่อ + ชุด และช่องที่ยังว่าง
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
              <div className="grid gap-4 sm:grid-cols-2">
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
                <Field label="หมวดเกม">
                  <select
                    className="min-h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                    value={form.categoryId ?? ""}
                    onChange={(e) => set("categoryId", e.target.value)}
                  >
                    <option value="">ไม่ระบุ (อื่น ๆ)</option>
                    {categoryOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <Field label="บริษัทเกรด">
                <GradingCompanyField
                  key={open ? "open" : "closed"}
                  value={form.gradingCompany}
                  onChange={(v) => set("gradingCompany", v)}
                />
              </Field>
              {form.gradingCompany && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="เกรด">
                    <Input
                      className={FIELD}
                      placeholder="เช่น 10 หรือ 9.5"
                      value={form.grade}
                      onChange={(e) => set("grade", e.target.value)}
                    />
                  </Field>
                  <Field label="เลขใบรับรอง">
                    <Input
                      className={FIELD}
                      value={form.certificationNo}
                      onChange={(e) => set("certificationNo", e.target.value)}
                    />
                  </Field>
                </div>
              )}

              <div className="rounded-2xl border border-dashed border-border">
                <button
                  type="button"
                  onClick={() => setMoreOpen((o) => !o)}
                  aria-expanded={moreOpen}
                  className="flex min-h-12 w-full items-center justify-between gap-2 px-4 text-left text-sm font-semibold"
                >
                  <span>
                    ข้อมูลเพิ่มเติม{" "}
                    <span className="font-normal text-muted-foreground">(ไม่บังคับ)</span>
                  </span>
                  <ChevronDown
                    className={cn("h-4 w-4 transition-transform", moreOpen && "rotate-180")}
                  />
                </button>
                {moreOpen && (
                  <div className="grid gap-4 px-4 pb-4 sm:grid-cols-2">
                    <Field label="เลขการ์ด">
                      <Input
                        className={FIELD}
                        value={form.cardNo}
                        onChange={(e) => set("cardNo", e.target.value)}
                      />
                    </Field>
                    <Field label="ภาษา">
                      <Input
                        className={FIELD}
                        value={form.language}
                        onChange={(e) => set("language", e.target.value)}
                      />
                    </Field>
                    <Field label="ความหายาก">
                      <Input
                        className={FIELD}
                        value={form.rarity}
                        onChange={(e) => set("rarity", e.target.value)}
                      />
                    </Field>
                    <Field label="ปี">
                      <Input
                        type="number"
                        className={FIELD}
                        value={form.year}
                        onChange={(e) => set("year", e.target.value)}
                      />
                    </Field>
                    <Field label="สภาพ" className="sm:col-span-2">
                      <Input
                        className={FIELD}
                        placeholder="เช่น Near Mint"
                        value={form.condition}
                        onChange={(e) => set("condition", e.target.value)}
                      />
                    </Field>
                    <Field label="รายละเอียดเพิ่มเติม" className="sm:col-span-2">
                      <Textarea
                        rows={3}
                        className="rounded-xl"
                        value={form.details}
                        onChange={(e) => set("details", e.target.value)}
                      />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="วิธีขาย">
                {(
                  [
                    {
                      v: "fixed_price",
                      icon: Tag,
                      title: "ขายราคาปกติ",
                      hint: "ตั้งราคา คนกดซื้อได้ทันที",
                    },
                    {
                      v: "auction",
                      icon: Gavel,
                      title: "เปิดประมูล",
                      hint: "ตั้งราคาเริ่ม ให้คนเสนอราคา",
                    },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={form.saleType === o.v}
                    onClick={() => set("saleType", o.v)}
                    className={cn(
                      "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors",
                      form.saleType === o.v
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-border hover:bg-secondary/60",
                    )}
                  >
                    <o.icon
                      className={cn(
                        "h-5 w-5",
                        form.saleType === o.v ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span className="font-semibold">{o.title}</span>
                    <span className="text-xs text-muted-foreground">{o.hint}</span>
                  </button>
                ))}
              </div>

              {form.saleType === "fixed_price" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="ราคาขาย (บาท) *">
                    <Input
                      type="number"
                      inputMode="numeric"
                      className={FIELD}
                      value={form.price}
                      onChange={(e) => set("price", e.target.value)}
                    />
                  </Field>
                  <Field label="จำนวนสต็อก (ชิ้น) *" hint="ระบบตัดสต็อกให้เองเมื่อมีคนซื้อ">
                    <Input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={9999}
                      className={FIELD}
                      value={form.stockQuantity}
                      onChange={(e) => set("stockQuantity", e.target.value)}
                    />
                  </Field>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="ราคาเริ่มต้น (บาท)">
                    <Input
                      type="number"
                      inputMode="numeric"
                      className={FIELD}
                      value={form.startingPrice}
                      onChange={(e) => set("startingPrice", e.target.value)}
                    />
                  </Field>
                  <Field label="เพิ่มขั้นละ (บาท)">
                    <Input
                      type="number"
                      inputMode="numeric"
                      className={FIELD}
                      value={form.bidIncrement}
                      onChange={(e) => set("bidIncrement", e.target.value)}
                    />
                  </Field>
                  <Field label="เริ่มประมูล" hint="เว้นว่าง = เริ่มทันที">
                    <Input
                      type="datetime-local"
                      className={FIELD}
                      value={form.startTime ?? ""}
                      onChange={(e) => set("startTime", e.target.value)}
                    />
                  </Field>
                  <Field label="ปิดประมูล *" hint="บันทึกร่างไม่ต้องใส่">
                    <Input
                      type="datetime-local"
                      className={FIELD}
                      value={form.endTime}
                      onChange={(e) => set("endTime", e.target.value)}
                    />
                  </Field>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 border-t border-border bg-background px-5 py-4 sm:px-6">
          {step > 0 ? (
            <Button
              variant="ghost"
              className="min-h-11 rounded-xl"
              onClick={() => setStep((s) => s - 1)}
            >
              ย้อนกลับ
            </Button>
          ) : (
            <Button
              variant="ghost"
              className="min-h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
          )}
          <span className="flex-1" />
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
            <span className="hidden sm:inline">บันทึกร่าง</span>
            <span className="sm:hidden">ร่าง</span>
          </Button>
          {last ? (
            <Button
              className="min-h-11 rounded-xl"
              disabled={create.isPending}
              onClick={() => submit(true)}
            >
              {submitting === "publish" && <Loader2 className="h-4 w-4 animate-spin" />}
              {form.saleType === "auction" ? "เปิดประมูล" : "ลงขาย"}
            </Button>
          ) : (
            <Button
              className="min-h-11 rounded-xl"
              onClick={() => validateStep(step) && setStep((s) => s + 1)}
            >
              ถัดไป
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  hint,
  className,
  children,
}: {
  label: string;
  hint?: string | undefined;
  className?: string | undefined;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="text-sm font-semibold">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
