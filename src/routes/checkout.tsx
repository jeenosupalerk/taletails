import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  MapPin,
  Plus,
  QrCode,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { SiteFooter } from "@/components/site/SiteFooter";
import { WonAuctionsPanel } from "@/components/site/WonAuctionsPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { products } from "@/data/products";
import { thb, useCart } from "@/lib/cart";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StatusDialog } from "@/components/ui/status-dialog";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ชำระเงิน — Taletails";
const description = "สรุปรายการการ์ดในตะกร้าและชำระเงินอย่างปลอดภัยกับ Taletails";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/checkout` },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/checkout` }],
  }),
  component: CheckoutPage,
});

const PAYMENT_METHODS = [
  { id: "promptpay", label: "QR PromptPay", hint: "แนะนำ • ไม่มีค่าธรรมเนียม" },
  { id: "card", label: "บัตรเครดิต / เดบิต", hint: "Visa, Mastercard, JCB" },
  { id: "wallet", label: "TaleTails Wallet", hint: "ยอดคงเหลือ ฿0" },
  { id: "installment", label: "ผ่อนชำระ", hint: "0% 3-10 เดือน" },
  { id: "banking", label: "Mobile Banking", hint: "โอนผ่านแอปธนาคาร" },
  { id: "truemoney", label: "TrueMoney Wallet", hint: "ชำระผ่าน TrueMoney" },
] as const;

const SHIPPING_FEE = 50;
const DISCOUNT = 50;

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-xs font-medium text-foreground">{value}</dd>
    </div>
  );
}

function CheckoutPage() {
  const router = useRouter();
  const { lines, total, clear } = useCart();
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payment, setPayment] = useState<string>("promptpay");
  const [draftPayment, setDraftPayment] = useState<string>("promptpay");
  const [addressOpen, setAddressOpen] = useState(false);
  const [address, setAddress] = useState<{ name: string; phone: string; detail: string } | null>(
    null,
  );
  const [discountCode, setDiscountCode] = useState("");

  const orderId = useMemo(
    () => `TT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
    [],
  );

  const subTotal = total;
  const grandTotal = Math.max(0, subTotal + (subTotal > 0 ? SHIPPING_FEE - DISCOUNT : 0));
  const points = Math.round(grandTotal / 100);
  const paymentLabel = PAYMENT_METHODS.find((m) => m.id === payment)?.label ?? "QR PromptPay";

  const [paidOpen, setPaidOpen] = useState(false);
  const [paidTotal, setPaidTotal] = useState(0);

  const submit = () => {
    if (!address) {
      toast.error("กรุณาระบุที่อยู่สำหรับจัดส่ง");
      setAddressOpen(true);
      return;
    }
    const total = grandTotal;
    clear();
    setPaidTotal(total);
    setPaidOpen(true);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* 1. Header bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-2">
          <button
            type="button"
            aria-label="ย้อนกลับ"
            onClick={() =>
              typeof window !== "undefined" && window.history.length > 1
                ? router.history.back()
                : void router.navigate({ to: "/marketplace" })
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-bold">ชำระเงิน (Checkout)</h1>
          <span className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
        {/* ของที่ชนะประมูลและรอชำระเงิน — แสดงเสมอในตะกร้า พร้อมเวลานับถอยหลัง */}
        <WonAuctionsPanel />

        {lines.length === 0 ? (
          <div className="surface-panel p-8 text-center">
            <ShoppingBag className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">ยังไม่มีสินค้าในตะกร้า</p>
            <Button asChild variant="secondary" className="mt-4 h-11 rounded-xl">
              <Link to="/marketplace">ไปเลือกซื้อการ์ด</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* 2. Product summary */}
            <section className="surface-panel overflow-hidden p-4">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[11px] font-semibold text-emerald-600">
                <Zap className="h-3 w-3" />
                พร้อมจัดส่ง 1-2 วัน
              </span>
              <ul className="mt-3 space-y-5">
                {lines.map((line) => {
                  const product = products.find((p) => p.id === line.id);
                  return (
                    <li key={line.id} className="space-y-3">
                      <div className="flex gap-3">
                        <img
                          src={line.imageUrl}
                          alt={line.name}
                          width={96}
                          height={128}
                          className="h-32 w-24 shrink-0 rounded-xl border border-border object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs text-muted-foreground">
                            {product ? product.storeName : "Taletails"}
                            {product?.isVerified && (
                              <span className="ml-1 text-[10px] font-semibold text-emerald-600">
                                ✓ ร้านยืนยัน
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-sm font-semibold">{line.name}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {product ? `${product.setName} • ${product.grade}` : "—"}
                          </p>
                          <p className="mt-1 font-display text-lg font-bold text-primary">
                            {thb.format(line.price * line.qty)}
                          </p>
                          <p className="text-xs text-muted-foreground">x{line.qty}</p>
                        </div>
                      </div>

                      {product && (
                        <div className="rounded-xl border border-border bg-secondary/30 p-3">
                          <p className="text-xs font-semibold text-foreground">รายละเอียดสินค้า</p>
                          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                            <Spec label="Card No." value={product.cardNo} />
                            <Spec label="ภาษา" value={product.language} />
                            <Spec label="Rarity" value={product.rarity} />
                            <Spec label="ปี" value={String(product.year)} />
                            <Spec label="Grade" value={product.grade} />
                            <Spec label="Grading" value={product.gradingCompany} />
                            <Spec label="Cert No." value={product.certificationNo} />
                            <Spec label="สภาพ" value={product.conditionTag} />
                          </dl>
                          <div className="mt-2 border-t border-border/70 pt-2">
                            <dt className="text-[11px] text-muted-foreground">สภาพ/ตำหนิ</dt>
                            <dd className="mt-0.5 text-xs text-foreground">{product.conditionNote}</dd>
                          </div>
                          <div className="mt-2">
                            <dt className="text-[11px] text-muted-foreground">รายละเอียดจากผู้ขาย</dt>
                            <dd className="mt-0.5 text-xs text-foreground">{product.sellerNote}</dd>
                          </div>
                        </div>
                      )}

                      {!product && (
                        <div className="flex flex-wrap gap-1.5">
                          {["ตลับการ์ด (ซีล)", "สภาพสมบูรณ์"].map((tag) => (
                            <span
                              key={tag}
                              className="rounded-lg bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>

            {/* 3. Shipping address */}
            <section className="surface-panel p-4">
              <h2 className="flex items-center gap-1.5 text-sm font-bold">
                <MapPin className="h-4 w-4 text-primary" />
                ที่อยู่สำหรับจัดส่ง
              </h2>
              {address ? (
                <div className="mt-3 rounded-xl border border-border p-3 text-sm">
                  <p className="font-semibold">
                    {address.name} · {address.phone}
                  </p>
                  <p className="mt-0.5 text-muted-foreground">{address.detail}</p>
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    className="mt-2 text-xs font-semibold text-primary"
                  >
                    แก้ไขที่อยู่
                  </button>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setAddressOpen(true)}
                    className="mt-3 flex h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-primary/10 text-sm font-semibold text-primary transition-colors hover:bg-primary/15"
                  >
                    <Plus className="h-4 w-4" />
                    เพิ่มที่อยู่จัดส่งใหม่
                  </button>
                  <p className="mt-3 rounded-xl bg-amber-500/12 px-3 py-2.5 text-xs font-semibold text-primary">
                    ⚠️ กรุณาระบุที่อยู่สำหรับจัดส่ง
                  </p>
                </>
              )}
            </section>

            {/* 4. Options */}
            <section className="surface-panel divide-y divide-border p-1">
              <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-3">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Truck className="h-4 w-4" />
                  วิธีการจัดส่ง
                </span>
                <span className="text-sm font-semibold">EMS Delivery (฿50)</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDraftPayment(payment);
                  setPaymentOpen(true);
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-3 text-left"
              >
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <QrCode className="h-4 w-4" />
                  วิธีชำระเงิน
                </span>
                <span className="flex items-center gap-1 text-sm font-semibold">
                  {paymentLabel}
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </span>
              </button>
              <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-3">
                <span className="text-sm text-muted-foreground">โค้ดส่วนลด</span>
                <div className="flex items-center gap-2">
                  <Input
                    value={discountCode}
                    onChange={(e) => setDiscountCode(e.target.value)}
                    placeholder="กรอกโค้ด"
                    className="h-10 w-32 rounded-xl text-sm"
                  />
                  <span className="text-xs font-semibold text-emerald-600">ใช้โค้ดลดค่าส่งแล้ว</span>
                </div>
              </div>
            </section>

            {/* 5. Bill */}
            <section className="surface-panel p-4">
              <h2 className="text-sm font-bold">สรุปยอดชำระ</h2>
              <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>หมายเลขคำสั่งซื้อ</dt>
                  <dd>{orderId}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ยอดรวมสินค้า</dt>
                  <dd className="font-semibold">{thb.format(subTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ค่าจัดส่ง</dt>
                  <dd className="font-semibold">{thb.format(SHIPPING_FEE)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ค่าบริการตรวจสอบการ์ดแท้</dt>
                  <dd className="font-semibold text-emerald-600">ฟรี</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">ส่วนลด</dt>
                  <dd className="font-semibold text-destructive">- {thb.format(DISCOUNT)}</dd>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <dt className="text-sm font-semibold">ยอดชำระสุทธิ</dt>
                  <dd className="font-display text-2xl font-extrabold text-primary">
                    {thb.format(grandTotal)}
                  </dd>
                </div>
              </dl>
              <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-500/12 px-3 py-2.5 text-xs font-semibold text-primary">
                <Coins className="h-4 w-4" />
                +{points} Points (ได้รับหลังจากคำสั่งซื้อสำเร็จ)
              </p>
            </section>
          </>
        )}
      </main>

      {lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(64px+max(0.75rem,env(safe-area-inset-bottom)))] z-40 px-4 lg:bottom-0 lg:border-t lg:border-border lg:bg-card/95 lg:pt-3 lg:pb-4 lg:backdrop-blur">
          <div className="mx-auto max-w-3xl rounded-2xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
            <ConfirmDialog
              title="ยืนยันคำสั่งซื้อ"
              description={`ยืนยันการสั่งซื้อยอดรวม ${thb.format(grandTotal)} และดำเนินการชำระเงินหรือไม่?`}
              confirmLabel="ยืนยันและชำระเงิน"
              onConfirm={submit}
              trigger={
                <Button className="h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90">
                  ดำเนินการชำระเงิน {thb.format(grandTotal)}
                </Button>
              }
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              การดำเนินการต่อถือว่าคุณยอมรับ ข้อกำหนดและเงื่อนไข
            </p>
          </div>
        </div>
      )}

      {/* 7. Payment bottom sheet */}
      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>เลือกวิธีชำระเงิน</SheetTitle>
          </SheetHeader>
          <RadioGroup
            value={draftPayment}
            onValueChange={setDraftPayment}
            className="mt-2 space-y-2 px-4"
          >
            {PAYMENT_METHODS.map((m) => (
              <label
                key={m.id}
                htmlFor={`pay-${m.id}`}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <RadioGroupItem id={`pay-${m.id}`} value={m.id} />
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{m.label}</span>
                  <span className="block text-xs text-muted-foreground">{m.hint}</span>
                </span>
              </label>
            ))}
          </RadioGroup>
          <div className="p-4">
            <Button
              onClick={() => {
                setPayment(draftPayment);
                setPaymentOpen(false);
              }}
              className="h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
            >
              ยืนยัน
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Address bottom sheet */}
      <Sheet open={addressOpen} onOpenChange={setAddressOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle>ที่อยู่สำหรับจัดส่ง</SheetTitle>
          </SheetHeader>
          <form
            className="space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const data = new FormData(form);
              setAddress({
                name: String(data.get("name") ?? ""),
                phone: String(data.get("phone") ?? ""),
                detail: String(data.get("detail") ?? ""),
              });
              setAddressOpen(false);
              toast.success("บันทึกที่อยู่จัดส่งแล้ว");
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="co-name">ชื่อ-นามสกุล</Label>
              <Input id="co-name" name="name" required className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-phone">เบอร์โทร</Label>
              <Input id="co-phone" name="phone" required className="h-11 rounded-xl" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-address">ที่อยู่</Label>
              <Input id="co-address" name="detail" required className="h-11 rounded-xl" />
            </div>
            <Button
              type="submit"
              className="h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
            >
              บันทึกที่อยู่
            </Button>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-accent" />
              ข้อมูลของคุณถูกเก็บอย่างปลอดภัย
            </p>
          </form>
        </SheetContent>
      </Sheet>

      <StatusDialog
        open={paidOpen}
        onOpenChange={setPaidOpen}
        tone="success"
        title="ชำระเงินสำเร็จ!"
        description={`หมายเลขคำสั่งซื้อ ${orderId}`}
        actionLabel="เลือกซื้อต่อ"
        onAction={() => void router.navigate({ to: "/marketplace" })}
        secondaryLabel="กลับหน้าแรก"
        onSecondary={() => void router.navigate({ to: "/" })}
      >
        <p>ยอดชำระทั้งหมด {thb.format(paidTotal)}</p>
      </StatusDialog>

      <SiteFooter />
    </div>
  );
}
