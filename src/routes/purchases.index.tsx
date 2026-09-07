import { Link, createFileRoute } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronRight, Loader2, PackageCheck, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useState } from "react";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "สถานะการซื้อสินค้า — Taletails";
const description =
  "ติดตามสถานะคำสั่งซื้อการ์ดของคุณ ตั้งแต่รอตรวจสอบการชำระเงิน จัดส่ง จนถึงยืนยันรับสินค้า";

export const Route = createFileRoute("/purchases/")({
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
  component: PurchasesPage,
});

export interface PurchaseOrder {
  id: string;
  total_amount: number;
  status: "pending" | "paid" | "shipped" | "cancelled" | "completed";
  slip_url: string | null;
  tracking_number: string | null;
  payment_method: string;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  received_at: string | null;
  created_at: string;
  auction_id: string | null;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    grade: string | null;
    images: string[];
  } | null;
}

export const PURCHASE_SELECT =
  "id, total_amount, status, slip_url, tracking_number, payment_method, shipping_name, shipping_phone, shipping_address, paid_at, shipped_at, received_at, created_at, auction_id, cards:card_id ( id, name, set_name, grade, images )";

export const STATUS_META: Record<
  PurchaseOrder["status"],
  { label: string; cls: string }
> = {
  pending: { label: "รอชำระ / รอตรวจสอบ", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  paid: { label: "อนุมัติแล้ว กำลังเตรียมจัดส่ง", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  shipped: { label: "จัดส่งแล้ว", cls: "bg-sky-500/15 text-sky-600 dark:text-sky-400" },
  completed: { label: "สำเร็จ", cls: "bg-primary/15 text-primary" },
  cancelled: { label: "ยกเลิก", cls: "bg-destructive/15 text-destructive" },
};

export function useAuthUserId() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (alive) setUserId(data.session?.user.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user.id ?? null);
    });
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return userId;
}

function PurchasesPage() {
  const userId = useAuthUserId();

  const { data: orders, isLoading, refetch } = useQuery({
    queryKey: ["purchases", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(PURCHASE_SELECT)
        .eq("user_id", userId!)
        .neq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PurchaseOrder[];
    },
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  // ปิดรายการอัตโนมัติเมื่อจัดส่งครบ 7 วันแล้วลูกค้ายังไม่กดยืนยัน
  useEffect(() => {
    if (!orders?.length) return;
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const stale = orders.filter(
      (o) => o.status === "shipped" && o.shipped_at && new Date(o.shipped_at).getTime() <= cutoff,
    );
    if (!stale.length) return;
    void (async () => {
      for (const o of stale) {
        await supabase.rpc("confirm_order_received", { _order_id: o.id });
      }
      void refetch();
    })();
  }, [orders, refetch]);

  return (
    <PageShell title="สถานะการซื้อสินค้า" description="ติดตามสถานะคำสั่งซื้อของคุณ">
      <section className="mx-auto max-w-2xl space-y-4 px-4 py-6 pb-28 sm:px-6">
        <header>
          <h1 className="text-lg font-bold">สถานะการซื้อสินค้า</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            รายการที่ชำระเงินแล้ว พร้อมสถานะการอนุมัติและการจัดส่ง
          </p>
        </header>

        {!userId && (
          <div className="surface-panel p-8 text-center">
            <p className="text-sm font-medium">กรุณาเข้าสู่ระบบเพื่อดูสถานะการซื้อ</p>
            <Button asChild className="mt-4 min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        )}

        {userId && isLoading && (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <LogoLoader size={64} />
          </div>
        )}

        {userId && !isLoading && (!orders || orders.length === 0) && (
          <div className="surface-panel p-8 text-center">
            <PackageCheck className="mx-auto h-9 w-9 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">ยังไม่มีรายการที่ชำระเงินแล้ว</p>
            <Button asChild className="mt-5 min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground">
              <Link to="/marketplace">
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                เลือกดูสินค้า
              </Link>
            </Button>
          </div>
        )}

        {userId && orders && orders.length > 0 && (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  to="/purchases/$id"
                  params={{ id: o.id }}
                  className="surface-panel flex items-center gap-3 p-3 transition-colors hover:bg-secondary/40"
                >
                  <SmartImage
                    src={o.cards?.images?.[0] ?? "/taletails-logo.jpg"}
                    alt={o.cards?.name ?? "การ์ด"}
                    transformWidth={200}
                    wrapperClassName="h-20 w-16 shrink-0 rounded-xl border border-border"
                    className="object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        STATUS_META[o.status].cls,
                      )}
                    >
                      {o.status === "shipped" ? (
                        <Truck className="h-3 w-3" />
                      ) : o.status === "completed" ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : null}
                      {STATUS_META[o.status].label}
                    </span>
                    <p className="mt-1 truncate text-sm font-semibold">
                      {o.cards?.name ?? "การ์ด"}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      เลขคำสั่งซื้อ {o.id.slice(0, 8).toUpperCase()}
                    </p>
                    {o.tracking_number && (
                      <p className="mt-0.5 text-xs break-all text-muted-foreground">
                        เลขพัสดุ {o.tracking_number}
                      </p>
                    )}
                    <p className="mt-1 font-display text-base font-bold text-primary">
                      {thb.format(Number(o.total_amount ?? 0))}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </PageShell>
  );
}
