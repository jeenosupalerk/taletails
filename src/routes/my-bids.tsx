import { Link, createFileRoute } from "@tanstack/react-router";
import { CircleAlert, CircleCheck, Gavel } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { Button } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { Skeleton } from "@/components/ui/skeleton";
import {
  isBidLive,
  myBidState,
  useMyBids,
  type MyBidRow,
  type MyBidState,
} from "@/hooks/useMyBids";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { formatCountdownTh, useCountdown } from "@/hooks/useCountdown";
import { thb } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const SITE_URL = "https://www.taletails-trade.com";
const title = "การประมูลของฉัน | Taletails";
const description = "ดูทุกรอบที่คุณเคยเสนอราคา ว่านำอยู่ ถูกแซง ชนะ หรือไม่ได้ชนะ";

export const Route = createFileRoute("/my-bids")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/my-bids` }],
  }),
  component: MyBidsPage,
});

const STATE_UI: Record<MyBidState, { label: string; className: string }> = {
  leading: {
    label: "คุณนำอยู่",
    className: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
  },
  outbid: { label: "ถูกแซงแล้ว", className: "bg-destructive/10 text-destructive" },
  won: { label: "คุณชนะ", className: "bg-emerald-600 text-white" },
  lost: { label: "ไม่ได้ชนะ", className: "bg-muted text-muted-foreground" },
  finalizing: {
    label: "กำลังสรุปผล",
    className: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  },
};

function MyBidsPage() {
  const { isAuthenticated } = useAuth();
  const bids = useMyBids();

  const now = Date.now();
  const rows = bids.data ?? [];
  // กำลังประมูล: ใกล้ปิดก่อน · จบแล้ว: ปิดล่าสุดก่อน
  const live = rows
    .filter((r) => isBidLive(r, now))
    .sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
  const closed = rows
    .filter((r) => !isBidLive(r, now))
    .sort((a, b) => new Date(b.endTime).getTime() - new Date(a.endTime).getTime());

  return (
    <PageShell
      title="การประมูลของฉัน"
      description="รอบที่คุณเคยเสนอราคา"
      icon={Gavel}
      trail={[{ label: "บัญชี", to: "/profile" }]}
    >
      <section className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-10 sm:px-6 lg:px-8">
        {!isAuthenticated ? (
          <div className="rounded-3xl border border-dashed border-border py-14 text-center">
            <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อดูการประมูลของคุณ</p>
            <Button asChild className="mt-4 min-h-11 rounded-xl px-5">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : bids.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : bids.isError ? (
          <div className="rounded-3xl border border-dashed border-destructive/40 py-14 text-center">
            <p className="text-sm text-muted-foreground">โหลดรายการไม่สำเร็จ กรุณาลองอีกครั้ง</p>
            <Button className="mt-4 min-h-11 rounded-xl px-5" onClick={() => void bids.refetch()}>
              ลองอีกครั้ง
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <Gavel className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              ยังไม่เคยเสนอราคา ลองเข้าร่วมประมูลรอบที่เปิดอยู่
            </p>
            <Button asChild className="mt-4 min-h-11 rounded-xl px-5">
              <Link to="/auctions" search={{ id: undefined }}>
                <Gavel className="h-4 w-4" />
                ไปหน้าประมูล
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {live.length > 0 && (
              <BidSection heading="กำลังประมูล" count={live.length}>
                {live.map((r) => (
                  <BidCard key={r.auctionId} row={r} />
                ))}
              </BidSection>
            )}
            {closed.length > 0 && (
              <BidSection heading="จบแล้ว" count={closed.length}>
                {closed.map((r) => (
                  <BidCard key={r.auctionId} row={r} />
                ))}
              </BidSection>
            )}
          </>
        )}
      </section>
    </PageShell>
  );
}

function BidSection({
  heading,
  count,
  children,
}: {
  heading: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-semibold">
        {heading}
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
      </h2>
      <ul className="space-y-3">{children}</ul>
    </div>
  );
}

function BidCard({ row }: { row: MyBidRow }) {
  const userId = useAuthUserId();
  // ใช้ตัวนับเวลาตัดสินว่าจบแล้วหรือยัง เพื่อให้การ์ดเปลี่ยนสถานะทันทีตอนหมดเวลา ไม่ต้องรอรีเฟรช
  const countdown = useCountdown(row.endTime);
  const finished = countdown?.isFinished ?? false;
  const state = myBidState(row, userId, finished ? Number.MAX_SAFE_INTEGER : Date.now());
  const ui = STATE_UI[state];
  const live = state === "leading" || state === "outbid";
  const raiseTo = row.currentPrice + row.bidIncrement;

  const body = (
    <div className="flex gap-3.5">
      <SmartImage
        src={row.image ?? "/taletails-logo.jpg"}
        alt={row.name}
        transformWidth={200}
        wrapperClassName="h-28 w-20 shrink-0 rounded-xl"
        className="object-cover"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold",
              ui.className,
            )}
          >
            {(state === "leading" || state === "won") && <CircleCheck className="h-3.5 w-3.5" />}
            {state === "outbid" && <CircleAlert className="h-3.5 w-3.5" />}
            {ui.label}
          </span>
          {live && countdown && !finished && (
            <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
              เหลือ {formatCountdownTh(countdown)}
            </span>
          )}
        </div>
        <p className="mt-1.5 truncate font-display text-sm font-semibold">{row.name}</p>
        <p className="truncate text-xs text-muted-foreground">
          {[row.setName, row.grade ? `${row.gradingCompany ?? ""} ${row.grade}`.trim() : null]
            .filter(Boolean)
            .join(" • ") || "-"}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 text-xs">
          <div>
            <p className="text-muted-foreground">ราคาของคุณ</p>
            <p className="font-display text-sm font-semibold tabular-nums">
              {thb.format(row.myBest)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">{live ? "ราคาตอนนี้" : "ราคาปิด"}</p>
            <p className="font-display text-sm font-semibold tabular-nums">
              {thb.format(row.currentPrice)}
            </p>
          </div>
        </div>
        {state === "outbid" && (
          <p className="mt-2 text-[11px] font-medium text-destructive">
            เสนอ {thb.format(raiseTo)} ขึ้นไปเพื่อกลับมานำ
          </p>
        )}
        {state === "won" && (
          <p className="mt-2 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
            ดูรายการที่ชนะและชำระเงินได้ที่ "ของที่ประมูลชนะ"
          </p>
        )}
      </div>
    </div>
  );

  const cardCls =
    "block rounded-2xl border border-border bg-card p-3.5 transition-[colors,transform] hover:border-primary/30 active:scale-[0.99] sm:p-4";

  return (
    <li>
      {state === "won" ? (
        <Link to="/wins" className={cardCls}>
          {body}
        </Link>
      ) : (
        <Link to="/card/$id" params={{ id: row.cardId }} className={cardCls}>
          {body}
        </Link>
      )}
    </li>
  );
}
