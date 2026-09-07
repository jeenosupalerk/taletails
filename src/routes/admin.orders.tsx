import { createFileRoute } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { CheckCircle2, ExternalLink, Loader2, Truck, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  useAdminOrders,
  useAdminUpdateOrder,
  useSlipLink,
  type AdminOrderRow,
} from "@/hooks/useAdmin";
import { thb } from "@/lib/cart";
import { SmartImage } from "@/components/ui/smart-image";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrdersPage,
});

const STATUS: Record<AdminOrderRow["status"], { label: string; cls: string }> = {
  pending: { label: "รอชำระเงิน", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  paid: { label: "ชำระแล้ว", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  shipped: { label: "จัดส่งแล้ว", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  cancelled: { label: "ยกเลิก", cls: "bg-destructive/15 text-destructive" },
};

const FILTERS = ["all", "pending", "paid", "shipped", "cancelled"] as const;

function AdminOrdersPage() {
  const orders = useAdminOrders();
  const update = useAdminUpdateOrder();
  const slip = useSlipLink();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [tracking, setTracking] = useState<Record<string, string>>({});

  const rows = (orders.data ?? []).filter((o) => filter === "all" || o.status === filter);

  const openSlip = (path: string) =>
    slip.mutate(path, {
      onSuccess: (url) => window.open(url, "_blank", "noopener"),
      onError: (e) => toast.error(e instanceof Error ? e.message : "เปิดสลิปไม่สำเร็จ"),
    });

  const act = (
    orderId: string,
    payload: { status?: "paid" | "shipped" | "cancelled"; trackingNumber?: string },
    message: string,
  ) =>
    update.mutate(
      { orderId, ...payload },
      {
        onSuccess: () => toast.success(message),
        onError: (e) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
      },
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">คำสั่งซื้อ</h2>
        <div className="flex gap-1 overflow-x-auto rounded-2xl border border-border bg-card p-1">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`min-h-10 shrink-0 rounded-xl px-3.5 text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary"
              }`}
            >
              {f === "all" ? "ทั้งหมด" : STATUS[f].label}
            </button>
          ))}
        </div>
      </div>

      {orders.isLoading ? (
        <div className="grid place-items-center py-16">
          <LogoLoader size={64} />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          ไม่มีคำสั่งซื้อในหมวดนี้
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <li key={o.id} className="rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 sm:p-4">
              <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-secondary">
                  {o.cards?.images?.[0] && (
                    <SmartImage
                      src={o.cards.images[0]}
                      alt={o.cards.name}
                      transformWidth={160}
                      className="object-cover"
                    />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-semibold">
                      #{o.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[o.status].cls}`}
                    >
                      {STATUS[o.status].label}
                    </span>
                    {o.auction_id && (
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px]">
                        จากการประมูล
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-sm">{o.cards?.name ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">
                    {o.users?.username ?? o.users?.email ?? o.user_id.slice(0, 8)} •{" "}
                    {o.shipping_phone ?? "ไม่มีเบอร์"}
                  </p>
                  {o.shipping_address && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {o.shipping_name} — {o.shipping_address}
                    </p>
                  )}
                  {o.status === "pending" && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                      ต้องชำระภายใน {new Date(o.payment_due_at).toLocaleString("th-TH")}
                    </p>
                  )}
                </div>

                <div className="w-full text-left sm:w-auto sm:text-right">
                  <p className="font-display text-base font-semibold">
                    {thb.format(o.total_amount)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {o.payment_method === "slip" ? "โอน + สลิป" : "QR PromptPay"}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-dashed border-border pt-3">
                {o.slip_url && (
                  <Button
                    variant="secondary"
                    className="min-h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto"
                    onClick={() => openSlip(o.slip_url!)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    ดูสลิป
                  </Button>
                )}
                {o.status === "pending" && (
                  <ConfirmDialog
                    title="ยืนยันการชำระเงิน"
                    description={`ยืนยันว่าได้รับเงินสำหรับคำสั่งซื้อ #${o.id.slice(0, 8)} แล้ว? ระบบจะแจ้งลูกค้าอัตโนมัติ`}
                    confirmLabel="ยืนยันชำระเงิน"
                    onConfirm={() => act(o.id, { status: "paid" }, "ยืนยันการชำระเงินแล้ว")}
                    trigger={
                      <Button className="min-h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        ยืนยันชำระเงิน
                      </Button>
                    }
                  />
                )}
                {o.status === "paid" && (
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                    <Input
                      placeholder="เลขพัสดุ"
                      className="min-h-10 w-full rounded-xl text-xs sm:w-40"
                      value={tracking[o.id] ?? ""}
                      onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                    />
                    <ConfirmDialog
                      title="ยืนยันการจัดส่ง"
                      description={`บันทึกการจัดส่งด้วยเลขพัสดุ "${(tracking[o.id] ?? "").trim() || "-"}" และแจ้งลูกค้าหรือไม่?`}
                      confirmLabel="ส่งของ"
                      onConfirm={() => {
                        const t = (tracking[o.id] ?? "").trim();
                        if (!t) {
                          toast.error("กรุณากรอกเลขพัสดุ");
                          return;
                        }
                        act(o.id, { status: "shipped", trackingNumber: t }, "บันทึกการจัดส่งแล้ว");
                      }}
                      trigger={
                        <Button className="min-h-10 rounded-xl px-3 text-xs">
                          <Truck className="h-3.5 w-3.5" />
                          กดส่งของ
                        </Button>
                      }
                    />
                  </div>
                )}
                {o.tracking_number && (
                  <span className="text-xs text-muted-foreground">
                    เลขพัสดุ {o.tracking_number}
                  </span>
                )}
                {(o.status === "pending" || o.status === "paid") && (
                  <ConfirmDialog
                    title="ยืนยันการยกเลิกคำสั่งซื้อ"
                    description={`ต้องการยกเลิกคำสั่งซื้อ #${o.id.slice(0, 8)} หรือไม่? การ์ดจะกลับมาพร้อมขายอีกครั้ง`}
                    confirmLabel="ยกเลิกคำสั่งซื้อ"
                    cancelLabel="ไม่ยกเลิก"
                    tone="destructive"
                    onConfirm={() => act(o.id, { status: "cancelled" }, "ยกเลิกคำสั่งซื้อแล้ว")}
                    trigger={
                      <Button
                        variant="ghost"
                        className="min-h-10 rounded-xl px-3 text-xs text-destructive"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        ยกเลิก
                      </Button>
                    }
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
