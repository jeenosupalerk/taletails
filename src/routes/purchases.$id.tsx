import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, Copy, Loader2, Package, Truck } from "lucide-react";
import { toast } from "sonner";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SmartImage } from "@/components/ui/smart-image";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";
import {
  PURCHASE_SELECT,
  STATUS_META,
  useAuthUserId,
  type PurchaseOrder,
} from "./purchases.index";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "รายละเอียดสถานะคำสั่งซื้อ — Taletails";
const description =
  "ดูสถานะคำสั่งซื้อการ์ด เลขพัสดุจัดส่ง และยืนยันการรับสินค้าบน Taletails";

export const Route = createFileRoute("/purchases/$id")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/purchases` }],
  }),
  component: PurchaseDetailPage,
});

function fmt(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function PurchaseDetailPage() {
  const { id } = Route.useParams();
  const userId = useAuthUserId();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ["purchase", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(PURCHASE_SELECT)
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as PurchaseOrder | null;
    },
    refetchInterval: 15_000,
  });

  const confirmReceived = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("confirm_order_received", { _order_id: id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("ยืนยันรับสินค้าแล้ว ขอบคุณครับ");
      void queryClient.invalidateQueries({ queryKey: ["purchase", id] });
      void queryClient.invalidateQueries({ queryKey: ["purchases"] });
    },
    onError: (e: unknown) => {
      toast.error(e instanceof Error ? e.message : "ยืนยันรับสินค้าไม่สำเร็จ");
    },
  });

  const autoDeadline =
    order?.status === "shipped" && order.shipped_at
      ? new Date(new Date(order.shipped_at).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : null;

  const steps = order
    ? [
        { label: "ชำระเงินแล้ว / รออนุมัติ", at: order.created_at, done: true },
        {
          label: "แอดมินอนุมัติการชำระเงิน",
          at: order.paid_at,
          done: ["paid", "shipped", "completed"].includes(order.status),
        },
        {
          label: "ส่งสินค้ากับขนส่งแล้ว",
          at: order.shipped_at,
          done: ["shipped", "completed"].includes(order.status),
        },
        {
          label: "ได้รับสินค้าแล้ว (สำเร็จ)",
          at: order.received_at,
          done: order.status === "completed",
        },
      ]
    : [];

  return (
    <PageShell title="รายละเอียดคำสั่งซื้อ" description="สถานะและการจัดส่ง">
      <section className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28 sm:px-6">
        <Button asChild variant="ghost" className="min-h-10 gap-1 rounded-xl px-2 text-sm">
          <Link to="/purchases">
            <ChevronLeft className="h-4 w-4" />
            สถานะการซื้อสินค้า
          </Link>
        </Button>

        {isLoading && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {!isLoading && !order && (
          <div className="surface-panel p-8 text-center text-sm">
            ไม่พบคำสั่งซื้อนี้ หรือคุณไม่มีสิทธิ์ดูรายการนี้
          </div>
        )}

        {order && (
          <>
            <div className="surface-panel p-4">
              <div className="flex gap-3">
                <SmartImage
                  src={order.cards?.images?.[0] ?? "/taletails-logo.jpg"}
                  alt={order.cards?.name ?? "การ์ด"}
                  transformWidth={240}
                  wrapperClassName="h-24 w-20 shrink-0 rounded-xl border border-border"
                  className="object-cover"
                />
                <div className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                      STATUS_META[order.status].cls,
                    )}
                  >
                    {STATUS_META[order.status].label}
                  </span>
                  <p className="mt-1 text-sm font-semibold break-words">
                    {order.cards?.name ?? "การ์ด"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    เลขคำสั่งซื้อ {order.id.slice(0, 8).toUpperCase()}
                  </p>
                  <p className="mt-1 font-display text-lg font-bold text-primary">
                    {thb.format(Number(order.total_amount ?? 0))}
                  </p>
                </div>
              </div>
            </div>

            <div className="surface-panel p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <Package className="h-4 w-4 text-primary" />
                สถานะการดำเนินการ
              </h2>
              <ol className="mt-4 space-y-4">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                        s.done
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {s.done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className={cn("text-sm font-medium", !s.done && "text-muted-foreground")}>
                        {s.label}
                      </p>
                      <p className="text-xs text-muted-foreground">{fmt(s.at)}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {order.tracking_number && (
              <div className="surface-panel p-4">
                <h2 className="flex items-center gap-2 text-sm font-bold">
                  <Truck className="h-4 w-4 text-primary" />
                  ข้อมูลการจัดส่ง
                </h2>
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-secondary/60 px-3 py-2">
                  <span className="min-w-0 flex-1 text-sm font-semibold break-all">
                    {order.tracking_number}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="min-h-9 rounded-lg px-2"
                    onClick={() => {
                      void navigator.clipboard.writeText(order.tracking_number ?? "");
                      toast.success("คัดลอกเลขพัสดุแล้ว");
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {order.shipping_address && (
                  <p className="mt-3 text-xs leading-relaxed break-words text-muted-foreground">
                    ส่งถึง {order.shipping_name} {order.shipping_phone}
                    <br />
                    {order.shipping_address}
                  </p>
                )}
              </div>
            )}

            {order.status === "shipped" && (
              <div className="surface-panel space-y-3 p-4">
                <p className="text-xs leading-relaxed text-muted-foreground">
                  เมื่อได้รับสินค้าแล้ว กรุณากดยืนยันการรับสินค้า หากไม่กดยืนยัน ระบบจะเปลี่ยนสถานะเป็น
                  “สำเร็จ” อัตโนมัติภายใน 7 วันหลังจัดส่ง (ประมาณ {fmt(autoDeadline)})
                </p>
                <ConfirmDialog
                  title="ยืนยันการรับสินค้า"
                  description="ยืนยันว่าคุณได้รับสินค้าเรียบร้อยแล้วหรือไม่?"
                  confirmLabel="ยืนยันรับสินค้า"
                  onConfirm={() => confirmReceived.mutate()}
                  trigger={
                    <Button
                      className="min-h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground"
                      disabled={confirmReceived.isPending}
                    >
                      {confirmReceived.isPending ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle2 className="mr-1.5 h-4 w-4" />
                      )}
                      ยืนยันการรับสินค้า
                    </Button>
                  }
                />
              </div>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}
