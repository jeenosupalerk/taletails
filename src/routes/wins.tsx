import { Link, createFileRoute } from "@tanstack/react-router";
import { Gavel, Loader2, PackageCheck, ShieldAlert, Trophy } from "lucide-react";

import { PaymentCountdown } from "@/components/site/PaymentCountdown";
import { PageShell } from "@/components/site/PageShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  penaltyLabel,
  useAuctionBanStatus,
  useAuctionWins,
  useMyPenalties,
  useWinsRealtime,
} from "@/hooks/useAuctionWins";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { thb } from "@/lib/cart";

const SITE_URL = "https://taletails-test.lovable.app";
const title = "ของที่ประมูลชนะ | Taletails";
const description =
  "รวมการ์ดที่คุณชนะการประมูล พร้อมเวลานับถอยหลังสำหรับชำระเงินและปุ่มไปชำระเงินทันที";

export const Route = createFileRoute("/wins")({
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
    links: [{ rel: "canonical", href: `${SITE_URL}/wins` }],
  }),
  component: WinsPage,
  errorComponent: WinsError,
});

function WinsError() {
  return (
    <PageShell
      eyebrow="คลังของฉัน"
      title="ของที่ประมูลชนะ"
      description="ตอนนี้ระบบดึงรายการของคุณไม่สำเร็จ กรุณาลองอีกครั้ง"
    >
      <section className="mx-auto max-w-3xl px-4 py-14 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          โหลดรายการที่ชนะประมูลไม่สำเร็จ อาจเป็นเพราะเซสชันหมดอายุ ลองเข้าสู่ระบบใหม่อีกครั้ง
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            className="h-11 rounded-xl px-5"
            onClick={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          >
            ลองอีกครั้ง
          </Button>
          <Button asChild variant="secondary" className="h-11 rounded-xl px-5">
            <Link to="/auth">เข้าสู่ระบบ</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}

const statusMeta: Record<string, { label: string; className: string }> = {
  pending: { label: "รอชำระเงิน", className: "bg-primary/15 text-primary" },
  paid: { label: "ชำระเงินแล้ว", className: "bg-emerald-500/15 text-emerald-600" },
  shipped: { label: "จัดส่งแล้ว", className: "bg-sky-500/15 text-sky-600" },
  cancelled: { label: "ยกเลิก (ไม่ชำระตามเวลา)", className: "bg-destructive/15 text-destructive" },
};

function WinsPage() {
  const userId = useAuthUserId();
  const wins = useAuctionWins();
  const ban = useAuctionBanStatus();
  const penalties = useMyPenalties();
  useWinsRealtime(userId);

  const rows = wins.data ?? [];
  const pending = rows.filter((r) => r.status === "pending");

  return (
    <PageShell
      eyebrow="คลังของฉัน"
      title="ของที่ประมูลชนะ"
      description="การ์ดที่คุณชนะการประมูลจะมาอยู่ที่นี่ ต้องชำระเงินภายใน 15 นาที นับจากเวลาที่ปิดประมูล"
    >
      <section className="mx-auto max-w-5xl space-y-5 px-4 py-10 sm:px-6 lg:px-8">
        {ban.data?.isBanned && (
          <div className="flex items-start gap-3 rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p className="font-display font-semibold text-destructive">
                {ban.data.isPermanent
                  ? "บัญชีของคุณถูกห้ามเข้าร่วมการประมูลถาวร"
                  : "บัญชีของคุณถูกห้ามเข้าร่วมการประมูลชั่วคราว"}
              </p>
              <p className="mt-1 text-muted-foreground">
                {ban.data.isPermanent
                  ? "กรุณาติดต่อทีมงานหากต้องการอุทธรณ์"
                  : ban.data.bannedUntil
                    ? `กลับมาประมูลได้อีกครั้ง ${new Date(ban.data.bannedUntil).toLocaleString("th-TH")}`
                    : "กรุณาติดต่อทีมงานเพื่อตรวจสอบสถานะ"}
              </p>
            </div>
          </div>
        )}

        {!userId ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              เข้าสู่ระบบเพื่อดูรายการที่คุณชนะการประมูล
            </p>
            <Button asChild className="mt-4 h-11 rounded-xl px-5">
              <Link to="/auth">เข้าสู่ระบบ</Link>
            </Button>
          </div>
        ) : wins.isLoading ? (
          <div className="space-y-3" aria-busy="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : wins.isError ? (
          <div className="rounded-3xl border border-dashed border-destructive/40 py-14 text-center">
            <p className="text-sm text-muted-foreground">
              โหลดรายการที่ชนะประมูลไม่สำเร็จ กรุณาลองอีกครั้ง
            </p>
            <Button className="mt-4 h-11 rounded-xl px-5" onClick={() => void wins.refetch()}>
              ลองอีกครั้ง
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-border py-16 text-center">
            <Trophy className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              ยังไม่มีรายการที่ชนะการประมูล ลองเข้าร่วมประมูลรอบถัดไป
            </p>
            <Button asChild className="mt-4 h-11 rounded-xl px-5">
              <Link to="/auctions" search={{ id: undefined }}>
                <Gavel className="h-4 w-4" />
                ไปหน้าประมูล
              </Link>
            </Button>
          </div>
        ) : (
          <>
            {pending.length > 0 && (
              <p className="text-sm text-muted-foreground">
                มี <span className="font-semibold text-foreground">{pending.length}</span> รายการที่รอชำระเงิน
                — หากเลยเวลา สิทธิ์จะถูกยกให้ผู้เสนอราคาอันดับถัดไป และคุณจะได้รับบทลงโทษ
              </p>
            )}

            <ul className="space-y-3">
              {rows.map((o) => {
                const meta = statusMeta[o.status] ?? statusMeta["pending"]!;
                const image = o.cards?.images?.[0] ?? "/taletails-logo.jpg";
                return (
                  <li
                    key={o.id}
                    className="rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 sm:p-4"
                  >
                    <div className="flex gap-3.5">
                      <img
                        src={image}
                        alt={o.cards?.name ?? "การ์ดที่ชนะประมูล"}
                        loading="lazy"
                        className="h-24 w-20 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={`h-5 rounded-full px-2 text-[10px] ${meta.className}`}>
                            {meta.label}
                          </Badge>
                          {o.status === "pending" && <PaymentCountdown dueAt={o.payment_due_at} />}
                        </div>
                        <p className="mt-1.5 truncate font-display text-sm font-semibold">
                          {o.cards?.name ?? "การ์ด"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {o.cards?.set_name ?? "-"}
                          {o.cards?.grade ? ` • เกรด ${o.cards.grade}` : ""}
                        </p>
                        <p className="mt-1 font-display text-base font-bold text-primary">
                          {thb.format(Number(o.total_amount))}
                        </p>
                        {o.status === "pending" && (
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            ต้องชำระภายใน {new Date(o.payment_due_at).toLocaleString("th-TH")}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                      {o.status === "pending" ? (
                        <Button asChild className="h-11 rounded-xl px-5 text-sm font-semibold">
                          <Link to="/checkout/$id" params={{ id: o.id }}>
                            ชำระเงินตอนนี้
                          </Link>
                        </Button>
                      ) : o.status === "cancelled" ? (
                        <Button asChild variant="secondary" className="h-11 rounded-xl px-5 text-sm">
                          <Link to="/auctions" search={{ id: undefined }}>ประมูลรอบอื่น</Link>
                        </Button>
                      ) : (
                        <Button asChild variant="secondary" className="h-11 rounded-xl px-5 text-sm">
                          <Link to="/order/$id" params={{ id: o.id }}>
                            <PackageCheck className="h-4 w-4" />
                            ดูสถานะคำสั่งซื้อ
                          </Link>
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {(penalties.data ?? []).length > 0 && (
          <div className="surface-panel p-4">
            <h2 className="font-display text-sm font-semibold">ประวัติบทลงโทษ</h2>
            <ul className="mt-2.5 space-y-2">
              {(penalties.data ?? []).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-xs">
                  <span className="truncate text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("th-TH")} • {p.reason ?? "-"}
                  </span>
                  <span
                    className={`shrink-0 font-display font-semibold ${p.cleared_at ? "text-muted-foreground line-through" : "text-destructive"}`}
                  >
                    {penaltyLabel(p.level)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2.5 text-[11px] text-muted-foreground">
              บทลงโทษ: ครั้งที่ 1 เตือน • ครั้งที่ 2 ห้ามประมูล 3 วัน • ครั้งที่ 3 ห้าม 1 สัปดาห์ •
              ครั้งที่ 4 ห้าม 1 เดือน • เกินกว่านั้นห้ามประมูลถาวร
            </p>
          </div>
        )}

        {wins.isFetching && !wins.isLoading && (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> กำลังอัปเดตข้อมูล
          </p>
        )}
      </section>
    </PageShell>
  );
}
