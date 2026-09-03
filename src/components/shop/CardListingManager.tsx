import { Link } from "@tanstack/react-router";
import { Gavel, ImagePlus, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  useUpdateAuctionEndTime,
  type NewCardInput,
} from "@/hooks/useAdmin";
import { thb } from "@/lib/cart";

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
  files: [],
};

const STATUS_LABEL: Record<string, string> = {
  available: "พร้อมขาย",
  locked: "ถูกจอง",
  sold: "ขายแล้ว",
};

export function CardListingManager({ scope = "admin" }: { scope?: "admin" | "shop" }) {
  const [form, setForm] = useState<NewCardInput>(EMPTY);
  const [open, setOpen] = useState(false);
  const adminCards = useAdminCards(scope === "admin");
  const myCards = useMyCards(scope === "shop");
  const cards = scope === "shop" ? myCards : adminCards;
  const create = useCreateCard();
  const del = useDeleteCard();
  const setEnd = useUpdateAuctionEndTime();

  const set = <K extends keyof NewCardInput>(key: K, value: NewCardInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const submit = () => {
    if (!form.name.trim()) {
      toast.error("กรุณากรอกชื่อการ์ด");
      return;
    }
    if (form.saleType === "fixed_price" && !Number(form.price)) {
      toast.error("กรุณากรอกราคาขาย");
      return;
    }
    if (form.saleType === "auction" && !form.endTime) {
      toast.error("กรุณาระบุวันเวลาปิดประมูล");
      return;
    }

    create.mutate(form, {
      onSuccess: () => {
        toast.success("ลงการ์ดใหม่เรียบร้อย");
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
        <Button className="h-11 rounded-xl" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-4 w-4" />
          ลงการ์ดใหม่
        </Button>
      </div>

      {open && (
        <section className="rounded-3xl border border-border bg-card p-5 shadow-[0_30px_70px_-60px_rgba(0,0,0,0.7)] sm:p-6">
          <h3 className="font-display text-base font-semibold">รายละเอียดการ์ด</h3>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="ชื่อการ์ด *">
              <Input
                className="h-11 rounded-xl"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </Field>
            <Field label="ชุด / เซ็ต">
              <Input
                className="h-11 rounded-xl"
                value={form.setName}
                onChange={(e) => set("setName", e.target.value)}
              />
            </Field>
            <Field label="เลขการ์ด">
              <Input
                className="h-11 rounded-xl"
                value={form.cardNo}
                onChange={(e) => set("cardNo", e.target.value)}
              />
            </Field>
            <Field label="ภาษา">
              <Input
                className="h-11 rounded-xl"
                value={form.language}
                onChange={(e) => set("language", e.target.value)}
              />
            </Field>
            <Field label="ความหายาก">
              <Input
                className="h-11 rounded-xl"
                value={form.rarity}
                onChange={(e) => set("rarity", e.target.value)}
              />
            </Field>
            <Field label="ปี">
              <Input
                type="number"
                className="h-11 rounded-xl"
                value={form.year}
                onChange={(e) => set("year", e.target.value)}
              />
            </Field>
            <Field label="สภาพ">
              <Input
                className="h-11 rounded-xl"
                placeholder="Near Mint"
                value={form.condition}
                onChange={(e) => set("condition", e.target.value)}
              />
            </Field>
            <Field label="เกรด">
              <Input
                className="h-11 rounded-xl"
                placeholder="PSA 10"
                value={form.grade}
                onChange={(e) => set("grade", e.target.value)}
              />
            </Field>
            <Field label="บริษัทเกรด">
              <Input
                className="h-11 rounded-xl"
                value={form.gradingCompany}
                onChange={(e) => set("gradingCompany", e.target.value)}
              />
            </Field>
            <Field label="เลขใบรับรอง">
              <Input
                className="h-11 rounded-xl"
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
            <Label className="text-xs font-medium text-muted-foreground">รูปการ์ด (หลายรูปได้)</Label>
            <label className="mt-1.5 flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border px-4 text-sm text-muted-foreground transition-colors hover:bg-secondary/50">
              <ImagePlus className="h-4 w-4" />
              {form.files.length ? `เลือกแล้ว ${form.files.length} รูป` : "เลือกไฟล์รูปภาพ"}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => set("files", Array.from(e.target.files ?? []))}
              />
            </label>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="รูปแบบการขาย">
              <Select
                value={form.saleType}
                onValueChange={(v) => set("saleType", v as "auction" | "fixed_price")}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fixed_price">ขายราคาปกติ</SelectItem>
                  <SelectItem value="auction">เปิดประมูล</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            {form.saleType === "fixed_price" ? (
              <Field label="ราคาขาย (บาท) *">
                <Input
                  type="number"
                  className="h-11 rounded-xl"
                  value={form.price}
                  onChange={(e) => set("price", e.target.value)}
                />
              </Field>
            ) : (
              <>
                <Field label="ราคาเริ่มต้น (บาท)">
                  <Input
                    type="number"
                    className="h-11 rounded-xl"
                    value={form.startingPrice}
                    onChange={(e) => set("startingPrice", e.target.value)}
                  />
                </Field>
                <Field label="ขั้นต่ำการเคาะ (บาท)">
                  <Input
                    type="number"
                    className="h-11 rounded-xl"
                    value={form.bidIncrement}
                    onChange={(e) => set("bidIncrement", e.target.value)}
                  />
                </Field>
                <Field label="วันเวลาปิดประมูล *">
                  <Input
                    type="datetime-local"
                    className="h-11 rounded-xl"
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-2">
            <Button className="h-11 rounded-xl" disabled={create.isPending} onClick={submit}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึกการ์ด
            </Button>
            <Button variant="ghost" className="h-11 rounded-xl" onClick={() => setOpen(false)}>
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
                <Skeleton className="h-10 flex-1 rounded-xl" />
                <Skeleton className="h-10 w-10 rounded-xl" />
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
          <Button className="h-11 rounded-xl" onClick={() => setOpen(true)}>
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
            return (
              <li
                key={c.id}
                className="rounded-2xl border border-border bg-card p-3 sm:p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {c.images?.[0] && (
                      <img src={c.images[0]} alt={c.name} className="h-full w-full object-cover" />
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
                    </p>
                  </div>
                  <p className="shrink-0 font-display text-sm font-semibold">
                    {thb.format(auction?.current_price ?? c.price)}
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
                  {auction && (
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
                      className="h-10 w-full rounded-xl text-xs sm:w-auto sm:flex-1"
                    />
                  )}
                  <Button asChild variant="secondary" className="h-10 flex-1 rounded-xl px-3 text-xs sm:flex-none">
                    <Link to="/card/$id" params={{ id: c.id }}>
                      ดูหน้าขาย
                    </Link>
                  </Button>
                  {c.status === "available" && (
                    <ConfirmDialog
                      title="ยืนยันการลบการ์ด"
                      description={`ต้องการลบ "${c.name}" ออกจากร้านหรือไม่? การลบไม่สามารถย้อนกลับได้`}
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
                          className="h-10 w-10 shrink-0 rounded-xl text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      }
                    />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
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
