import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import {
  ChevronLeft,
  Clock,
  Loader2,
  Package,
  ShoppingBag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "คำสั่งซื้อของฉัน — Taletails";
const description = "ดูรายการคำสั่งซื้อที่รอชำระเงิน และดำเนินการชำระเงินได้ทันที";

export const Route = createFileRoute("/orders")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/orders` }],
  }),
  component: OrdersPage,
});

interface PendingOrder {
  id: string;
  total_amount: number;
  status: string;
  payment_due_at: string;
  auction_id: string | null;
  created_at: string;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    grade: string | null;
    images: string[];
    price: number;
  } | null;
}

function usePendingOrders(userId: string | null) {
  return useQuery({
    queryKey: ["orders", "pending", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, total_amount, status, payment_due_at, auction_id, created_at, cards:card_id ( id, name, set_name, grade, images, price )",
        )
        .eq("user_id", userId!)
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PendingOrder[];
    },
    staleTime: 5_000,
    refetchInterval: 8_000,
  });
}

function OrdersPage() {
  const router = useRouter();
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

  const { data: orders, isLoading } = usePendingOrders(userId);

  return (
    <PageShell title="คำสั่งซื้อของฉัน" description="รายการที่รอชำระเงิน">
      <div className="min-h-screen bg-background pb-28">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur">
          <div className="mx-auto flex min-h-14 max-w-3xl items-center px-2">
            <button
              type="button"
              aria-label="ย้อนกลับ"
              onClick={() =>
                typeof window !== "undefined" && window.history.length > 1
                  ? router.history.back()
                  : void router.navigate({ to: "/profile" })
              }
              className="flex min-h-10 w-10 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-secondary"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <h1 className="flex-1 text-center text-base font-bold">คำสั่งซื้อของฉัน</h1>
            <span className="min-h-10 w-10" />
          </div>
        </header>

        <main className="mx-auto max-w-3xl space-y-4 px-4 py-4">
          {isLoading && (
            <div className="flex h-40 items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {!isLoading && (!orders || orders.length === 0) && (
            <div className="surface-panel p-8 text-center">
              <Package className="mx-auto h-9 w-9 text-muted-foreground" />
              <p className="mt-3 text-sm font-medium">ยังไม่มีคำสั่งซื้อที่รอชำระเงิน</p>
              <p className="mt-1 text-xs text-muted-foreground">
                เลือกการ์ดที่คุณสนใจแล้วมาชำระเงินได้ที่นี่
              </p>
              <Button asChild className="mt-5 min-h-11 rounded-xl bg-gradient-ember font-semibold text-primary-foreground">
                <Link to="/marketplace">
                  <ShoppingBag className="mr-1.5 h-4 w-4" />
                  เลือกดูสินค้า
                </Link>
              </Button>
            </div>
          )}

          {!isLoading && orders && orders.length > 0 && (
            <ul className="space-y-3">
              {orders.map((order) => (
                <OrderCard key={order.id} order={order} />
              ))}
            </ul>
          )}
        </main>
      </div>
    </PageShell>
  );
}

function OrderCard({ order }: { order: PendingOrder }) {
  const c = useCountdown(order.payment_due_at);
  const minutes = c ? c.days * 1440 + c.hours * 60 + c.minutes : 0;
  const expired = !!c?.isFinished;
  const total = Number(order.total_amount ?? 0);

  return (
    <li className="surface-panel p-3">
      <div className="flex gap-3">
        <SmartImage
          src={order.cards?.images?.[0] ?? "/taletails-logo.jpg"}
          alt={order.cards?.name ?? "การ์ด"}
          transformWidth={240}
          wrapperClassName="h-24 w-20 shrink-0 rounded-xl border border-border"
          className="object-cover"
        />
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            {order.auction_id ? "ชนะการประมูล" : "สินค้า 1-of-1"}
          </span>
          <p className="mt-1 text-sm font-semibold break-words">
            {order.cards?.name ?? "การ์ด"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            เลขคำสั่งซื้อ {order.id.slice(0, 8).toUpperCase()}
          </p>
          <p className="mt-1.5 font-display text-lg font-bold text-primary">
            {thb.format(total)}
          </p>
        </div>
      </div>

      <div
        className={cn(
          "mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-xs",
          expired
            ? "bg-destructive/10 text-destructive"
            : "bg-primary/10 text-primary",
        )}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" />
        {expired ? (
          <span className="font-medium">หมดเวลาชำระแล้ว</span>
        ) : (
          <span className="font-medium tabular-nums">
            รอชำระภายใน {pad(minutes)}:{pad(c?.seconds ?? 0)}
          </span>
        )}
      </div>

      <Button asChild className="mt-3 min-h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90">
        <Link to="/checkout/$id" params={{ id: order.id }}>
          ดำเนินการชำระเงิน
        </Link>
      </Button>
    </li>
  );
}
