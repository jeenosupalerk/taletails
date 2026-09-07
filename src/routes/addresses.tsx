import { Link, createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddAddress,
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
} from "@/hooks/useAddresses";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ที่อยู่สำหรับจัดส่ง | Taletails";
const description =
  "จัดการสมุดที่อยู่จัดส่งของคุณ เพิ่ม ลบ และตั้งที่อยู่เริ่มต้นเพื่อใช้ในหน้าชำระเงิน";

export const Route = createFileRoute("/addresses")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/addresses` }],
  }),
  component: AddressesPage,
});

const emptyForm = {
  label: "บ้าน",
  name: "",
  phone: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postcode: "",
};

type Form = typeof emptyForm;

function AddressesPage() {
  const userId = useAuthUserId();
  const { data, isLoading } = useAddresses(userId ?? null);
  const addAddress = useAddAddress(userId ?? null);
  const setDefault = useSetDefaultAddress(userId ?? null);
  const removeAddress = useDeleteAddress(userId ?? null);

  const list = data ?? [];
  const [open, setOpen] = useState(false);
  const [makeDefault, setMakeDefault] = useState(false);
  const [form, setForm] = useState<Form>(emptyForm);
  const set = (k: keyof Form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const complete = Object.values(form).every((v) => v.trim().length > 0);

  const submit = () => {
    if (!complete) {
      toast.error("กรุณากรอกข้อมูลที่อยู่ให้ครบถ้วน");
      return;
    }
    addAddress.mutate(
      { ...form, is_default: makeDefault || list.length === 0 },
      {
        onSuccess: () => {
          toast.success("บันทึกที่อยู่แล้ว");
          setForm(emptyForm);
          setMakeDefault(false);
          setOpen(false);
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกไม่สำเร็จ"),
      },
    );
  };

  if (!userId) {
    return (
      <PageShell title="ที่อยู่สำหรับจัดส่ง" description="จัดการสมุดที่อยู่จัดส่งของคุณ">
        <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
          <p className="text-sm text-muted-foreground">
            กรุณาเข้าสู่ระบบเพื่อจัดการสมุดที่อยู่ของคุณ
          </p>
          <Button asChild className="h-11 rounded-full px-6">
            <Link to="/auth">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="ที่อยู่สำหรับจัดส่ง"
      description="ที่อยู่ที่บันทึกไว้จะถูกนำไปใช้เลือกในหน้าชำระเงินโดยอัตโนมัติ"
    >
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 pb-28">

        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-3xl bg-secondary/50" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border p-8 text-center">
            <MapPin className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">ยังไม่มีที่อยู่ที่บันทึกไว้</p>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <article
                key={a.id}
                className={cn(
                  "rounded-3xl border bg-card p-4",
                  a.is_default ? "border-primary/60" : "border-border/70",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{a.label}</span>
                  {a.is_default && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      ค่าเริ่มต้น
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {a.name} • {a.phone}
                </p>
                <p className="mt-0.5 text-xs break-words text-muted-foreground">
                  {a.address} ต.{a.subdistrict} อ.{a.district} จ.{a.province} {a.postcode}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
                  {!a.is_default && (
                    <button
                      type="button"
                      onClick={() =>
                        setDefault.mutate(a.id, {
                          onSuccess: () => toast.success("ตั้งเป็นที่อยู่เริ่มต้นแล้ว"),
                          onError: () => toast.error("ทำรายการไม่สำเร็จ"),
                        })
                      }
                      className="min-h-10 rounded-xl border border-border px-3 text-xs font-medium hover:border-primary/50"
                    >
                      ตั้งเป็นค่าเริ่มต้น
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      removeAddress.mutate(a.id, {
                        onSuccess: () => toast.success("ลบที่อยู่แล้ว"),
                        onError: () => toast.error("ลบไม่สำเร็จ"),
                      })
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-border px-3 text-xs font-medium text-destructive hover:border-destructive/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    ลบ
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {open ? (
          <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
            <h2 className="font-display text-sm tracking-[0.16em] uppercase">เพิ่มที่อยู่ใหม่</h2>
            <FormField id="a-label" label="ชื่อเรียกที่อยู่" value={form.label} onChange={set("label")} placeholder="เช่น บ้าน / ที่ทำงาน" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="a-name" label="ชื่อ-นามสกุล" value={form.name} onChange={set("name")} placeholder="เช่น สมชาย ใจดี" />
              <FormField id="a-phone" label="เบอร์โทรศัพท์" value={form.phone} onChange={set("phone")} placeholder="08X-XXX-XXXX" inputMode="tel" />
            </div>
            <FormField id="a-address" label="ที่อยู่จัดส่ง" value={form.address} onChange={set("address")} placeholder="บ้านเลขที่ / หมู่บ้าน / ถนน" />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField id="a-sub" label="ตำบล / แขวง" value={form.subdistrict} onChange={set("subdistrict")} placeholder="เช่น คลองตัน" />
              <FormField id="a-dist" label="อำเภอ / เขต" value={form.district} onChange={set("district")} placeholder="เช่น วัฒนา" />
              <FormField id="a-prov" label="จังหวัด" value={form.province} onChange={set("province")} placeholder="เช่น กรุงเทพมหานคร" />
              <FormField id="a-zip" label="รหัสไปรษณีย์" value={form.postcode} onChange={set("postcode")} placeholder="10110" inputMode="numeric" />
            </div>
            <label className="flex items-center gap-2.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={makeDefault}
                onChange={(e) => setMakeDefault(e.target.checked)}
                className="h-4 w-4 accent-[hsl(var(--primary))]"
              />
              ตั้งเป็นที่อยู่เริ่มต้น
            </label>
            <div className="flex gap-2 pt-1">
              <Button
                onClick={submit}
                disabled={addAddress.isPending}
                className="h-11 flex-1 rounded-full"
              >
                {addAddress.isPending ? "กำลังบันทึก..." : "บันทึกที่อยู่"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                className="h-11 rounded-full px-5"
              >
                ยกเลิก
              </Button>
            </div>
          </section>
        ) : (
          <Button onClick={() => setOpen(true)} className="h-11 w-full rounded-full">
            <Plus className="mr-1.5 h-4 w-4" />
            เพิ่มที่อยู่ใหม่
          </Button>
        )}
      </div>
    </PageShell>
  );
}

function FormField({
  id,
  label,
  value,
  onChange,
  placeholder,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputMode?: "tel" | "numeric";
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="h-[42px] rounded-xl"
      />
    </div>
  );
}
