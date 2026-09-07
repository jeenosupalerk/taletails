import { Link, useNavigate } from "@tanstack/react-router";
import {
  BadgeCheck,
  CheckCircle2,
  ChevronLeft,
  Loader2,
  Lock,
  QrCode,
  Receipt,
  ShieldCheck,
  Trash2,
  Upload,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { CheckoutStepper } from "@/components/checkout/CheckoutStepper";
import { PromptPayQR } from "@/components/checkout/PromptPayQR";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  useAddAddress,
  useAddresses,
  useDeleteAddress,
  useSetDefaultAddress,
  type SavedAddress,
} from "@/hooks/useAddresses";
import { useAuthUserId, useCancelOrder, useOrder, useSubmitPayment } from "@/hooks/useCardDetail";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { thb } from "@/lib/cart";
import { startPromptPayPayment } from "@/lib/payments.functions";
import { cn } from "@/lib/utils";
import { StatusDialog } from "@/components/ui/status-dialog";

const STORAGE_KEY = "taletails.shipping";
const FIELD = "min-h-[42px] h-[42px] rounded-xl text-sm";

interface Shipping {
  name: string;
  phone: string;
  address: string;
  subdistrict: string;
  district: string;
  province: string;
  postcode: string;
}

const emptyShipping: Shipping = {
  name: "",
  phone: "",
  address: "",
  subdistrict: "",
  district: "",
  province: "",
  postcode: "",
};

/** แถบนับถอยหลังเวลาที่สินค้าถูกล็อกไว้ */
function ReservationBanner({ dueAt }: { dueAt: string | null }) {
  const c = useCountdown(dueAt ?? new Date(Date.now() + 15 * 60_000).toISOString());
  const minutes = c ? c.days * 1440 + c.hours * 60 + c.minutes : 15;
  const expired = !!c?.isFinished;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-2xl border px-4 py-3",
        expired
          ? "border-destructive/40 bg-destructive/10"
          : "border-primary/30 bg-primary/10 shadow-[0_18px_45px_-40px_hsl(var(--primary)/0.8)]",
      )}
    >
      <span
        className={cn(
          "grid min-h-9 w-9 shrink-0 place-items-center rounded-full",
          expired ? "bg-destructive/15 text-destructive" : "bg-gradient-ember text-primary-foreground",
        )}
      >
        <Lock className="h-4 w-4" />
      </span>
      <p className="min-w-0 flex-1 text-xs leading-relaxed break-words">
        {expired ? (
          <span className="font-medium text-destructive">หมดเวลาชำระเงินสำหรับรายการนี้</span>
        ) : (
          <>
            <span className="font-medium">สินค้าถูกล็อกไว้ให้คุณ</span> กรุณาชำระเงินภายใน
          </>
        )}
      </p>
      {!expired && (
        <span className="animate-pulse font-display text-lg font-semibold tabular-nums text-primary">
          {c ? `${pad(minutes)}:${pad(c.seconds)}` : "--:--"}
        </span>
      )}
    </div>
  );
}

/** Shared checkout surface used by /checkout/$id and /order/$id. */
export function OrderCheckout({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const userId = useAuthUserId();

  const orderQuery = useOrder(orderId);
  const order = orderQuery.data ?? null;
  const submit = useSubmitPayment(orderId);
  const cancel = useCancelOrder(orderId);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [ship, setShip] = useState<Shipping>(emptyShipping);
  const [remember, setRemember] = useState(true);
  const [method, setMethod] = useState<"auto" | "manual">("auto");
  const [redirecting, setRedirecting] = useState(false);
  const startAutoPay = useServerFn(startPromptPayPayment);
  const [stage, setStage] = useState<"details" | "pay">("details");
  const [done, setDone] = useState(false);
  const [paidOpen, setPaidOpen] = useState(false);

  // สมุดที่อยู่จัดส่ง
  const addressBook = useAddresses(userId ?? null);
  const addAddress = useAddAddress(userId ?? null);
  const setDefaultAddress = useSetDefaultAddress(userId ?? null);
  const removeAddress = useDeleteAddress(userId ?? null);
  const savedAddresses = addressBook.data ?? [];
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressLabel, setAddressLabel] = useState("บ้าน");
  const [makeDefault, setMakeDefault] = useState(false);
  const [editingNew, setEditingNew] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setShip({ ...emptyShipping, ...(JSON.parse(raw) as Partial<Shipping>) });
    } catch {
      /* ignore */
    }
  }, []);

  const applyAddress = (a: SavedAddress) => {
    setSelectedAddressId(a.id);
    setEditingNew(false);
    setShip({
      name: a.name,
      phone: a.phone,
      address: a.address,
      subdistrict: a.subdistrict,
      district: a.district,
      province: a.province,
      postcode: a.postcode,
    });
  };

  // เลือกที่อยู่เริ่มต้นให้อัตโนมัติเมื่อโหลดสมุดที่อยู่ครั้งแรก
  useEffect(() => {
    if (selectedAddressId || editingNew || savedAddresses.length === 0) return;
    const preferred = savedAddresses.find((a) => a.is_default) ?? savedAddresses[0]!;
    applyAddress(preferred);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedAddresses.length]);

  /** บันทึกที่อยู่ใหม่เข้าสมุดที่อยู่ (เมื่อผู้ใช้เลือกให้จำ) */
  const rememberAddress = () => {
    if (!remember || !userId || selectedAddressId) return;
    addAddress.mutate({
      ...ship,
      label: addressLabel.trim() || "ที่อยู่จัดส่ง",
      is_default: makeDefault || savedAddresses.length === 0,
    });
  };

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k: keyof Shipping) => (v: string) => setShip((s) => ({ ...s, [k]: v }));

  const addressComplete = useMemo(
    () =>
      !!(
        ship.name.trim() &&
        ship.phone.trim() &&
        ship.address.trim() &&
        ship.subdistrict.trim() &&
        ship.district.trim() &&
        ship.province.trim() &&
        ship.postcode.trim()
      ),
    [ship],
  );

  const total = Number(order?.total_amount ?? 0);

  const goToPayment = () => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      void navigate({ to: "/auth" });
      return;
    }
    if (!addressComplete) {
      toast.error("กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วน");
      return;
    }
    if (remember) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ship));
      } catch {
        /* ignore */
      }
      rememberAddress();
    }
    if (method === "auto") {
      void startAuto();
      return;
    }
    setStage("pay");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** ชำระผ่าน PromptPay อัตโนมัติ: ระบบตรวจเงินเข้าเอง ไม่ต้องแนบสลิป */
  const startAuto = async () => {
    setRedirecting(true);
    try {
      const fullAddress = `${ship.address} ต.${ship.subdistrict} อ.${ship.district} จ.${ship.province} ${ship.postcode}`;
      const result = await startAutoPay({
        data: {
          orderId,
          shipping: { name: ship.name, phone: ship.phone, address: fullAddress },
        },
      });
      if ("error" in result && result.error) throw new Error(result.error);
      if ("url" in result && result.url) {
        window.location.href = result.url;
        return;
      }
      throw new Error("ไม่สามารถเริ่มการชำระเงินได้");
    } catch (e) {
      setRedirecting(false);
      toast.error(e instanceof Error ? e.message : "เริ่มการชำระเงินไม่สำเร็จ");
    }
  };



  const send = () => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      void navigate({ to: "/auth" });
      return;
    }
    if (!addressComplete) {
      toast.error("กรุณากรอกข้อมูลที่อยู่จัดส่งให้ครบถ้วน");
      return;
    }
    if (!file) {
      toast.error("กรุณาแนบสลิปการโอนเงิน");
      return;
    }
    if (remember) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ship));
      } catch {
        /* ignore */
      }
    }
    const fullAddress = `${ship.address} ต.${ship.subdistrict} อ.${ship.district} จ.${ship.province} ${ship.postcode}`;
    submit.mutate(
      {
        userId,
        file,
        method: "qr_promptpay",
        shipping: { name: ship.name, phone: ship.phone, address: fullAddress },
      },
      {
        onSuccess: () => {
          setDone(true);
          setPaidOpen(true);
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };


  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-2xl items-center px-2">
          <Link
            to="/marketplace"
            aria-label="ย้อนกลับ"
            className="flex min-h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center font-display text-base font-semibold">ชำระเงิน</h1>
          <span className="min-h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {orderQuery.isLoading && (
          <div className="flex h-48 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!orderQuery.isLoading && !order && (
          <div className="rounded-3xl border border-border/70 bg-card p-8 text-center">
            <p className="font-display text-lg font-semibold">ไม่พบคำสั่งซื้อนี้</p>
            <p className="mt-2 text-sm text-muted-foreground">
              คำสั่งซื้ออาจถูกยกเลิก หรือคุณไม่มีสิทธิ์เข้าถึง
            </p>
          </div>
        )}

        {order && (
          <>
            {order.status === "pending" && !done && (
              <ReservationBanner dueAt={order.payment_due_at ?? null} />
            )}

            <CheckoutStepper
              current={done || order.status !== "pending" ? 3 : stage === "pay" ? 2 : 1}
            />

            {/* สรุปรายการสั่งซื้อ */}
            <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_18px_50px_-40px_hsl(var(--foreground)/0.5)]">
              <div className="flex gap-4 p-4">
                <div className="w-[84px] shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-secondary/40">
                  <img
                    src={order.cards?.images?.[0] ?? "/taletails-logo.jpg"}
                    alt={order.cards?.name ?? "การ์ด"}
                    className="aspect-[3/4] w-full object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium tracking-wide text-primary">
                    <BadgeCheck className="h-3 w-3" />
                    {order.auction_id ? "ชนะการประมูล" : "สินค้า 1-of-1"}
                  </span>
                  <p className="mt-1.5 font-display text-base leading-snug font-semibold break-words">
                    {order.cards?.name ?? "การ์ด"}
                  </p>
                  <p className="mt-0.5 text-xs break-words text-muted-foreground">
                    เซ็ต {order.cards?.set_name ?? "-"}
                    {order.cards?.grade ? ` • เกรด ${order.cards.grade}` : ""}
                  </p>
                  <p className="mt-2 font-display text-sm font-semibold">{thb.format(total)}</p>
                </div>
              </div>

              <dl className="space-y-2 border-t border-border/70 px-4 py-4 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">ราคาสินค้า</dt>
                  <dd className="tabular-nums">{thb.format(total)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">ค่าจัดส่ง (ลงทะเบียน EMS)</dt>
                  <dd className="text-primary">ฟรี</dd>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-2 border-t border-dashed border-border/70 pt-3">
                  <dt className="text-sm font-medium">ยอดรวมสุทธิที่ต้องชำระ</dt>
                  <dd className="font-display text-2xl leading-none font-semibold tabular-nums">
                    {thb.format(total)}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/70 bg-secondary/30 px-4 py-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5" />
                  เลขคำสั่งซื้อ {order.id.slice(0, 8).toUpperCase()}
                </span>
                <span>สถานะ: {order.status === "pending" ? "รอชำระเงิน" : order.status}</span>
              </div>
            </section>

            {done || order.status !== "pending" ? (
              <section className="rounded-3xl border border-border/70 bg-card p-8 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
                <p className="mt-3 font-display text-lg font-semibold">
                  ชำระเงินเรียบร้อย รอการตรวจสอบ
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  เลขคำสั่งซื้อ {order.id.slice(0, 8).toUpperCase()} — ทีมงานจะตรวจสอบสลิปและจัดส่ง
                  ให้เร็วที่สุด
                </p>
                <Link
                  to="/profile"
                  className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border px-5 text-sm font-medium"
                >
                  ดูคำสั่งซื้อของฉัน
                </Link>
              </section>
            ) : stage === "details" ? (
              <>
                {/* ที่อยู่จัดส่ง */}
                <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
                  <h2 className="font-display text-sm tracking-[0.16em] uppercase">ที่อยู่จัดส่ง</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      id="ship-name"
                      label="ชื่อ-นามสกุล"
                      placeholder="เช่น สมชาย ใจดี"
                      value={ship.name}
                      onChange={set("name")}
                    />
                    <Field
                      id="ship-phone"
                      label="เบอร์โทรศัพท์"
                      placeholder="08X-XXX-XXXX"
                      inputMode="tel"
                      value={ship.phone}
                      onChange={set("phone")}
                    />
                  </div>
                  <Field
                    id="ship-address"
                    label="ที่อยู่จัดส่ง"
                    placeholder="บ้านเลขที่ / หมู่บ้าน / ถนน"
                    value={ship.address}
                    onChange={set("address")}
                  />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field
                      id="ship-sub"
                      label="ตำบล / แขวง"
                      placeholder="เช่น คลองตัน"
                      value={ship.subdistrict}
                      onChange={set("subdistrict")}
                    />
                    <Field
                      id="ship-dist"
                      label="อำเภอ / เขต"
                      placeholder="เช่น วัฒนา"
                      value={ship.district}
                      onChange={set("district")}
                    />
                    <Field
                      id="ship-prov"
                      label="จังหวัด"
                      placeholder="เช่น กรุงเทพมหานคร"
                      value={ship.province}
                      onChange={set("province")}
                    />
                    <Field
                      id="ship-zip"
                      label="รหัสไปรษณีย์"
                      placeholder="10110"
                      inputMode="numeric"
                      value={ship.postcode}
                      onChange={set("postcode")}
                    />
                  </div>
                  <label className="flex items-start gap-2.5 pt-1 text-xs text-muted-foreground">
                    <Checkbox
                      checked={remember}
                      onCheckedChange={(v) => setRemember(v === true)}
                      className="mt-0.5"
                    />
                    บันทึกที่อยู่นี้ไว้สำหรับการสั่งซื้อครั้งต่อไป
                  </label>
                </section>

                {/* วิธีชำระเงิน */}
                <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-4">
                  <h2 className="font-display text-sm tracking-[0.16em] uppercase">วิธีชำระเงิน</h2>

                  <button
                    type="button"
                    onClick={() => setMethod("auto")}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                      method === "auto"
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/70 hover:border-primary/40",
                    )}
                  >
                    <span className="grid min-h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Zap className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold">PromptPay อัตโนมัติ</span>
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">
                          แนะนำ
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs break-words text-muted-foreground">
                        สแกน QR แล้วระบบตรวจเงินเข้าเอง ไม่ต้องแนบสลิป ไม่ต้องรอแอดมินยืนยัน
                      </span>
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethod("manual")}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors",
                      method === "manual"
                        ? "border-primary/60 bg-primary/5"
                        : "border-border/70 hover:border-primary/40",
                    )}
                  >
                    <span className="grid min-h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary text-foreground">
                      <QrCode className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-sm font-semibold">โอนเอง + แนบสลิป</span>
                      <span className="mt-0.5 block text-xs break-words text-muted-foreground">
                        สแกน QR PromptPay ของร้าน แล้วแนบสลิปให้ทีมงานตรวจสอบ
                      </span>
                    </span>
                  </button>
                </section>

                <Button
                  onClick={goToPayment}
                  disabled={redirecting}
                  className="h-12 w-full rounded-2xl bg-gradient-ember text-base font-semibold shadow-glow"
                >
                  {redirecting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  ดำเนินการชำระเงิน
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  {method === "auto"
                    ? "ขั้นต่อไปจะแสดง QR PromptPay ที่ระบบตรวจเงินเข้าให้อัตโนมัติ"
                    : "ขั้นต่อไปจะแสดง QR PromptPay พร้อมยอดเงินสำหรับสแกนและแนบสลิป"}
                </p>
                {!order.auction_id && (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    disabled={cancel.isPending}
                    className="mx-auto block min-h-10 text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive"
                  >
                    {cancel.isPending ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อนี้"}
                  </button>
                )}
              </>
            ) : (
              <>
                {/* ขั้นตอนชำระเงิน: QR PromptPay + แนบสลิป */}
                <section className="space-y-4 rounded-3xl border border-border/70 bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="font-display text-sm tracking-[0.16em] uppercase">
                      สแกน QR PromptPay เพื่อชำระเงิน
                    </h2>
                    <button
                      type="button"
                      onClick={() => setStage("details")}
                      className="text-xs font-semibold text-primary"
                    >
                      แก้ไขข้อมูล
                    </button>
                  </div>

                  <PromptPayQR amount={total} reference={order.id.slice(0, 8).toUpperCase()} />

                  {/* อัปโหลดสลิป */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">แนบหลักฐานการโอนเงิน</p>
                    {preview ? (
                      <div className="space-y-3">
                        <div className="mx-auto w-fit rounded-3xl border border-primary/40 bg-primary/5 p-1.5">
                          <img
                            src={preview}
                            alt="ตัวอย่างสลิป"
                            className="max-h-64 rounded-[calc(1.5rem-0.375rem)] object-contain"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setFile(null)}
                          className="h-11 w-full rounded-xl text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                          ลบรูปและเลือกใหม่
                        </Button>
                      </div>
                    ) : (
                      <label className="group flex cursor-pointer flex-col items-center gap-2.5 rounded-3xl border border-border/70 bg-secondary/30 p-1.5 text-center transition-colors hover:border-primary/40">
                        <span className="flex w-full flex-col items-center gap-2.5 rounded-[calc(1.5rem-0.375rem)] border border-dashed border-border/70 bg-card/70 px-4 py-8">
                          <span className="grid min-h-11 w-11 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-500 group-hover:-translate-y-0.5">
                            <Upload className="h-5 w-5" />
                          </span>
                          <span className="text-sm font-medium">
                            ลากวางหรือแตะเพื่อเลือกรูปสลิป
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            JPG หรือ PNG ไม่เกิน 10MB
                          </span>
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
                  </div>
                </section>

                <Button
                  onClick={send}
                  className="h-12 w-full rounded-2xl bg-gradient-ember text-base font-semibold shadow-glow"
                  disabled={submit.isPending}
                >
                  {submit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  ยืนยันการชำระเงินสำเร็จ
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                  สลิปของคุณจะถูกส่งให้ทีมงานตรวจสอบในระบบหลังบ้าน
                </p>
                {!order.auction_id && (
                  <button
                    type="button"
                    onClick={() => setCancelOpen(true)}
                    disabled={cancel.isPending}
                    className="mx-auto block min-h-10 text-xs font-medium text-muted-foreground underline underline-offset-4 transition-colors hover:text-destructive"
                  >
                    {cancel.isPending ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อนี้"}
                  </button>
                )}
              </>
            )}

          </>
        )}
      </main>

      <StatusDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        tone="warning"
        title="ยกเลิกคำสั่งซื้อนี้?"
        description="สินค้าจะถูกปลดล็อกและกลับไปเปิดขายในตลาดทันที"
        actionLabel="ยืนยันยกเลิก"
        onAction={() =>
          cancel.mutate(undefined, {
            onSuccess: () => {
              toast.success("ยกเลิกคำสั่งซื้อแล้ว สินค้ากลับไปเปิดขายแล้ว");
              void navigate({ to: "/marketplace" });
            },
            onError: (e) => toast.error(e.message),
          })
        }
        secondaryLabel="ชำระเงินต่อ"
      >
        {order ? <p>เลขคำสั่งซื้อ {order.id.slice(0, 8).toUpperCase()}</p> : null}
      </StatusDialog>

      <StatusDialog
        open={paidOpen}
        onOpenChange={setPaidOpen}
        tone="success"
        title="ชำระเงินเรียบร้อย รอการตรวจสอบคำสั่งซื้อ"
        description="เราได้รับสลิปของคุณแล้ว ทีมงานจะตรวจสอบและยืนยันภายใน 24 ชั่วโมง"
        actionLabel="ดูสถานะคำสั่งซื้อ"
        onAction={() => void navigate({ to: "/order/$id", params: { id: orderId } })}
        secondaryLabel="เลือกซื้อต่อ"
        onSecondary={() => void navigate({ to: "/marketplace" })}
      >
        <p>เลขคำสั่งซื้อ {orderId.slice(0, 8).toUpperCase()}</p>
        {order ? <p>ยอดชำระ {thb.format(total)}</p> : null}
      </StatusDialog>
    </div>
  );
}

function Field({
  id,
  label,
  placeholder,
  value,
  onChange,
  inputMode,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  inputMode?: "tel" | "numeric";
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">
        {label}
      </Label>
      <Input
        id={id}
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={FIELD}
      />
    </div>
  );
}

