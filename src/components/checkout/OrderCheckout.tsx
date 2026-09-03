import { Link, useNavigate } from "@tanstack/react-router";
import {
  CheckCircle2,
  ChevronLeft,
  Loader2,
  QrCode,
  Receipt,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthUserId, useOrder, useSubmitPayment } from "@/hooks/useCardDetail";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

type Method = "slip" | "qr_promptpay";

/** Shared checkout surface used by /checkout/$id and /order/$id. */
export function OrderCheckout({ orderId }: { orderId: string }) {
  const navigate = useNavigate();
  const userId = useAuthUserId();

  const orderQuery = useOrder(orderId);
  const order = orderQuery.data ?? null;
  const submit = useSubmitPayment(orderId);

  const [method, setMethod] = useState<Method>("slip");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!file) return setPreview(null);
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const send = () => {
    if (!userId) {
      toast.error("กรุณาเข้าสู่ระบบก่อนชำระเงิน");
      void navigate({ to: "/auth" });
      return;
    }
    if (!name.trim() || !phone.trim() || !address.trim()) {
      toast.error("กรุณากรอกชื่อ เบอร์โทร และที่อยู่จัดส่ง");
      return;
    }
    if (method === "slip" && !file) {
      toast.error("กรุณาแนบสลิปการโอนเงิน");
      return;
    }
    submit.mutate(
      { userId, file: method === "slip" ? file : null, method, shipping: { name, phone, address } },
      {
        onSuccess: () => {
          setDone(true);
          toast.success("ชำระเงินสำเร็จ — บันทึกคำสั่งซื้อแล้ว");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background pb-10">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-3xl items-center px-2">
          <Link
            to="/marketplace"
            aria-label="ย้อนกลับ"
            className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-secondary"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="flex-1 text-center font-display text-base font-semibold">ชำระเงิน</h1>
          <span className="h-10 w-10" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">
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
            <section className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-[0_18px_50px_-40px_hsl(var(--foreground)/0.5)]">
              <div className="flex gap-4 p-5">
                <div className="h-24 w-20 shrink-0 overflow-hidden rounded-2xl bg-secondary/40">
                  <img
                    src={order.cards?.images?.[0] ?? "/taletails-logo.jpg"}
                    alt={order.cards?.name ?? "การ์ด"}
                    className="h-full w-full object-contain p-1.5"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] tracking-[0.18em] text-muted-foreground uppercase">
                    {order.auction_id ? "ชนะการประมูล" : "ซื้อขาด"}
                  </p>
                  <p className="mt-1 truncate font-display text-lg font-semibold">
                    {order.cards?.name ?? "การ์ด"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {order.cards?.set_name ?? "-"} • {order.cards?.grade ?? "-"}
                  </p>
                  <p className="mt-2 font-display text-xl font-semibold">
                    {thb.format(Number(order.total_amount))}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between border-t border-border/70 px-5 py-3 text-xs text-muted-foreground">
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
                <p className="mt-3 font-display text-lg font-semibold">ชำระเงินเรียบร้อยแล้ว</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  การ์ดใบนี้ถูกบันทึกเป็น &quot;ขายแล้ว&quot; และทีมงานจะจัดส่งให้เร็วที่สุด
                </p>
                <Link
                  to="/profile"
                  className="mt-6 inline-flex h-11 items-center rounded-xl border border-border px-5 text-sm font-medium"
                >
                  ดูคำสั่งซื้อของฉัน
                </Link>
              </section>
            ) : (
              <>
                <section className="space-y-3 rounded-3xl border border-border/70 bg-card p-5">
                  <h2 className="font-display text-sm tracking-[0.16em] uppercase">ที่อยู่จัดส่ง</h2>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="ship-name" className="text-xs">
                        ชื่อผู้รับ
                      </Label>
                      <Input
                        id="ship-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="ship-phone" className="text-xs">
                        เบอร์โทร
                      </Label>
                      <Input
                        id="ship-phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="ship-address" className="text-xs">
                      ที่อยู่
                    </Label>
                    <Input
                      id="ship-address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-11 rounded-xl"
                    />
                  </div>
                </section>

                <section className="space-y-4 rounded-3xl border border-border/70 bg-card p-5">
                  <h2 className="font-display text-sm tracking-[0.16em] uppercase">วิธีชำระเงิน</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {(
                      [
                        { id: "slip", label: "แนบสลิปโอนเงิน", icon: Upload },
                        { id: "qr_promptpay", label: "QR PromptPay", icon: QrCode },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMethod(m.id)}
                        className={cn(
                          "flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition-colors",
                          method === m.id
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-border text-muted-foreground hover:bg-secondary",
                        )}
                      >
                        <m.icon className="h-4 w-4" />
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {method === "slip" ? (
                    <div className="space-y-3">
                      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center transition-colors hover:bg-secondary/50">
                        <Upload className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {file ? file.name : "เลือกรูปสลิปการโอนเงิน"}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          JPG หรือ PNG ไม่เกิน 10MB
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {preview && (
                        <img
                          src={preview}
                          alt="ตัวอย่างสลิป"
                          className="mx-auto max-h-64 rounded-2xl border border-border object-contain"
                        />
                      )}
                    </div>
                  ) : (
                    <PromptPayQR
                      amount={Number(order.total_amount)}
                      reference={order.id.slice(0, 8).toUpperCase()}
                    />
                  )}
                </section>

                <Button
                  className="h-11 w-full rounded-xl"
                  onClick={send}
                  disabled={submit.isPending}
                >
                  {submit.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}
                  ยืนยันการชำระเงิน
                </Button>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
