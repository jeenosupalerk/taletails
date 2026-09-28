import { createFileRoute } from "@tanstack/react-router";
import { ImagePlus, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import banner1 from "@/assets/banner-1.jpg";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Switch } from "@/components/ui/switch";
import {
  slugify,
  uploadBannerImage,
  useAdminBanners,
  useCategories,
  useDeleteBanner,
  useDeleteCategory,
  useSaveBanner,
  useSaveCategory,
  type BannerInput,
  type CategoryInput,
  type SiteBanner,
} from "@/hooks/useSiteContent";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/banners")({
  component: AdminBannersPage,
});

const CARD = "space-y-4 rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6";
const FIELD = "min-h-11 rounded-xl";

/** ISO → ค่าให้ input datetime-local (เวลาเครื่อง) */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
const dateFmt = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

/** สถานะที่ผู้เยี่ยมชมเห็นจริง — เปิดอยู่แต่ยังไม่ถึงเวลา/หมดเวลาแล้วก็ถือว่าไม่แสดง */
function bannerState(b: SiteBanner) {
  const now = Date.now();
  if (!b.is_active) return { label: "ปิดอยู่", tone: "muted" as const };
  if (b.starts_at && new Date(b.starts_at).getTime() > now)
    return { label: `เริ่ม ${dateFmt.format(new Date(b.starts_at))}`, tone: "wait" as const };
  if (b.ends_at && new Date(b.ends_at).getTime() <= now)
    return { label: "หมดเวลาแล้ว", tone: "muted" as const };
  return { label: "กำลังแสดง", tone: "live" as const };
}

function AdminBannersPage() {
  return (
    <div className="space-y-6">
      <BannersSection />
      <CategoriesSection />
    </div>
  );
}

/* ---------------- banner ---------------- */

const EMPTY_BANNER: BannerInput = {
  title: "",
  subtitle: "",
  image_url: null,
  cta_text: "",
  cta_link: "",
  sort_order: 0,
  is_active: true,
  starts_at: null,
  ends_at: null,
};

function BannersSection() {
  const { data, isLoading } = useAdminBanners();
  const del = useDeleteBanner();
  const [editing, setEditing] = useState<BannerInput | null>(null);
  const banners = data ?? [];

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Banner หน้าแรก</h2>
          <p className="text-sm text-muted-foreground">
            เรียงตาม "ลำดับ" น้อยไปมาก · แนะนำรูปแนวนอนอย่างน้อย 1600×500 px
          </p>
        </div>
        <Button
          className="min-h-11 rounded-xl"
          onClick={() =>
            setEditing({ ...EMPTY_BANNER, sort_order: (banners.at(-1)?.sort_order ?? 0) + 10 })
          }
        >
          <Plus className="h-4 w-4" /> เพิ่ม banner
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <LogoLoader size={48} />
        </div>
      )}
      {!isLoading && banners.length === 0 && (
        <p className="rounded-2xl bg-secondary/60 p-4 text-sm text-muted-foreground">
          ยังไม่มี banner — หน้าแรกจะใช้ banner ตั้งต้นของเว็บไปก่อน
        </p>
      )}

      <ul className="space-y-3">
        {banners.map((b) => {
          const state = bannerState(b);
          return (
            <li
              key={b.id}
              className="flex flex-col gap-3 rounded-2xl p-2 ring-1 ring-border sm:flex-row sm:items-center"
            >
              <img
                src={b.image_url || banner1}
                alt=""
                className="aspect-[16/5] w-full rounded-xl object-cover sm:w-56"
              />
              <div className="min-w-0 flex-1 px-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                      state.tone === "live" && "bg-emerald-500/15 text-emerald-700",
                      state.tone === "wait" && "bg-amber-500/15 text-amber-700",
                      state.tone === "muted" && "bg-muted text-muted-foreground",
                    )}
                  >
                    {state.label}
                  </span>
                  <span className="text-xs text-muted-foreground">ลำดับ {b.sort_order}</span>
                </div>
                <p className="mt-1 truncate font-semibold">{b.title}</p>
                {b.subtitle && (
                  <p className="truncate text-sm text-muted-foreground">{b.subtitle}</p>
                )}
              </div>
              <div className="flex gap-2 px-1 pb-1 sm:pb-0">
                <Button
                  variant="secondary"
                  className="min-h-11 flex-1 rounded-xl sm:flex-none"
                  onClick={() => setEditing({ ...b })}
                >
                  <Pencil className="h-4 w-4" /> แก้ไข
                </Button>
                <ConfirmDialog
                  trigger={
                    <Button
                      variant="ghost"
                      className="min-h-11 rounded-xl text-destructive"
                      aria-label="ลบ banner"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                  title="ลบ banner นี้?"
                  description="banner จะหายจากหน้าแรกทันที (ไฟล์รูปยังเก็บไว้ในระบบ) ถ้าแค่อยากซ่อนชั่วคราว ให้ปิดสวิตช์ 'แสดงบนหน้าแรก' แทน"
                  confirmLabel="ลบ banner"
                  tone="destructive"
                  onConfirm={() =>
                    del.mutate(b.id, {
                      onSuccess: () => toast.success("ลบ banner แล้ว"),
                      onError: (e) => toast.error(e.message),
                    })
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      {editing && <BannerEditor initial={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function BannerEditor({ initial, onClose }: { initial: BannerInput; onClose: () => void }) {
  const [form, setForm] = useState<BannerInput>(initial);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const save = useSaveBanner();
  const set = <K extends keyof BannerInput>(k: K, v: BannerInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const pickImage = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      set("image_url", await uploadBannerImage(file));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.title.trim()) {
      toast.error("ใส่หัวข้อ banner ก่อน");
      return;
    }
    if (form.starts_at && form.ends_at && form.starts_at >= form.ends_at) {
      toast.error("เวลาเริ่มต้องอยู่ก่อนเวลาสิ้นสุด");
      return;
    }
    if (form.cta_text?.trim() && !form.cta_link?.trim()) {
      toast.error("ใส่ลิงก์ของปุ่มด้วย");
      return;
    }
    save.mutate(
      {
        ...form,
        title: form.title.trim(),
        subtitle: form.subtitle?.trim() || null,
        cta_text: form.cta_text?.trim() || null,
        cta_link: form.cta_link?.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("บันทึก banner แล้ว");
          onClose();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="space-y-4 rounded-2xl bg-secondary/40 p-4 ring-1 ring-primary/30">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{form.id ? "แก้ไข banner" : "banner ใหม่"}</h3>
        <Button
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11"
          aria-label="ปิด"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* ตัวอย่างใกล้เคียงหน้าแรกจริง */}
      <div className="relative overflow-hidden rounded-2xl">
        <img
          src={form.image_url || banner1}
          alt=""
          className="aspect-[16/5] min-h-40 w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-fade" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="line-clamp-1 text-lg font-bold text-white sm:text-2xl">
            {form.title || "หัวข้อ banner"}
          </p>
          {form.subtitle && (
            <p className="line-clamp-2 text-xs text-white/80 sm:text-sm">{form.subtitle}</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          className="absolute top-3 right-3 min-h-11 rounded-xl"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus className="h-4 w-4" />
          )}
          {form.image_url ? "เปลี่ยนรูป" : "อัปโหลดรูป"}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            void pickImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>หัวข้อ</Label>
          <Input
            className={FIELD}
            maxLength={80}
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label>ข้อความรอง (ไม่เกิน 2 บรรทัด)</Label>
          <Input
            className={FIELD}
            maxLength={160}
            value={form.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>ข้อความบนปุ่ม (เว้นว่าง = ไม่มีปุ่ม)</Label>
          <Input
            className={FIELD}
            maxLength={40}
            placeholder="เช่น เข้าสู่ห้องประมูล"
            value={form.cta_text ?? ""}
            onChange={(e) => set("cta_text", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>ลิงก์ของปุ่ม</Label>
          <Input
            className={FIELD}
            placeholder="/auctions หรือ /marketplace"
            value={form.cta_link ?? ""}
            onChange={(e) => set("cta_link", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>เริ่มแสดง (เว้นว่าง = ทันที)</Label>
          <Input
            type="datetime-local"
            className={FIELD}
            value={toLocalInput(form.starts_at)}
            onChange={(e) => set("starts_at", fromLocalInput(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>หยุดแสดง (เว้นว่าง = ไม่มีกำหนด)</Label>
          <Input
            type="datetime-local"
            className={FIELD}
            value={toLocalInput(form.ends_at)}
            onChange={(e) => set("ends_at", fromLocalInput(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label>ลำดับ (น้อย = ขึ้นก่อน)</Label>
          <Input
            type="number"
            className={FIELD}
            value={form.sort_order}
            onChange={(e) => set("sort_order", Number(e.target.value) || 0)}
          />
        </div>
        <label className="flex min-h-11 items-center gap-3 self-end">
          <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
          <span className="text-sm font-medium">แสดงบนหน้าแรก</span>
        </label>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" className="min-h-11 rounded-xl" onClick={onClose}>
          ยกเลิก
        </Button>
        <Button
          className="min-h-11 rounded-xl"
          disabled={save.isPending || uploading}
          onClick={submit}
        >
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          บันทึก
        </Button>
      </div>
    </div>
  );
}

/* ---------------- หมวดเกม ---------------- */

function CategoriesSection() {
  const { data, isLoading } = useCategories();
  const save = useSaveCategory();
  const del = useDeleteCategory();
  const [draft, setDraft] = useState<CategoryInput | null>(null);
  const categories = data ?? [];

  const submit = () => {
    if (!draft) return;
    const name = draft.name.trim();
    const slug = (draft.slug.trim() || slugify(name)).toLowerCase();
    if (!name) {
      toast.error("ใส่ชื่อหมวดก่อน");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("slug ใช้ได้เฉพาะ a-z, 0-9 และ -");
      return;
    }
    save.mutate(
      { ...draft, name, slug },
      {
        onSuccess: () => {
          toast.success("บันทึกหมวดแล้ว");
          setDraft(null);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <section className={CARD}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">หมวดเกม</h2>
          <p className="text-sm text-muted-foreground">
            แสดงเป็นแถบบนหน้าตลาดซื้อขาย · การ์ดที่ไม่ระบุหมวดจะอยู่ใน "อื่น ๆ"
          </p>
        </div>
        <Button
          className="min-h-11 rounded-xl"
          onClick={() =>
            setDraft({
              name: "",
              slug: "",
              is_active: true,
              sort_order: (categories.at(-1)?.sort_order ?? 0) + 10,
            })
          }
        >
          <Plus className="h-4 w-4" /> เพิ่มหมวด
        </Button>
      </div>

      {isLoading && (
        <div className="flex h-24 items-center justify-center">
          <LogoLoader size={40} />
        </div>
      )}

      <ul className="divide-y divide-border rounded-2xl ring-1 ring-border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center gap-3 px-4 py-2">
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "font-semibold",
                  !c.is_active && "text-muted-foreground line-through",
                )}
              >
                {c.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {c.slug} · ลำดับ {c.sort_order}
                {!c.is_active && " · ซ่อนอยู่"}
              </p>
            </div>
            <Button
              variant="ghost"
              className="min-h-11 rounded-xl"
              onClick={() => setDraft({ ...c })}
            >
              <Pencil className="h-4 w-4" />
              <span className="sr-only">แก้ไข {c.name}</span>
            </Button>
            <ConfirmDialog
              trigger={
                <Button variant="ghost" className="min-h-11 rounded-xl text-destructive">
                  <Trash2 className="h-4 w-4" />
                  <span className="sr-only">ลบ {c.name}</span>
                </Button>
              }
              title={`ลบหมวด "${c.name}"?`}
              description="การ์ดในหมวดนี้จะไม่หาย แค่กลับไปอยู่ใน 'อื่น ๆ' ถ้าแค่อยากซ่อนชั่วคราว ให้ปิดสวิตช์ 'แสดง' แทน"
              confirmLabel="ลบหมวด"
              tone="destructive"
              onConfirm={() =>
                del.mutate(c.id, {
                  onSuccess: () => toast.success("ลบหมวดแล้ว"),
                  onError: (e) => toast.error(e.message),
                })
              }
            />
          </li>
        ))}
        {!isLoading && categories.length === 0 && (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            ยังไม่มีหมวด — หน้าตลาดจะไม่แสดงแถบหมวด
          </li>
        )}
      </ul>

      {draft && (
        <div className="grid gap-4 rounded-2xl bg-secondary/40 p-4 ring-1 ring-primary/30 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
          <div className="space-y-1.5">
            <Label>ชื่อหมวด</Label>
            <Input
              className={FIELD}
              placeholder="เช่น Dragon Ball"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>slug (ใช้ในลิงก์)</Label>
            <Input
              className={FIELD}
              placeholder={slugify(draft.name) || "dragon-ball"}
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>ลำดับ</Label>
            <Input
              type="number"
              className={FIELD}
              value={draft.sort_order}
              onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })}
            />
          </div>
          <label className="flex min-h-11 items-center gap-2">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            <span className="text-sm">แสดง</span>
          </label>
          <div className="flex justify-end gap-2 sm:col-span-4">
            <Button variant="ghost" className="min-h-11 rounded-xl" onClick={() => setDraft(null)}>
              ยกเลิก
            </Button>
            <Button className="min-h-11 rounded-xl" disabled={save.isPending} onClick={submit}>
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึก
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
