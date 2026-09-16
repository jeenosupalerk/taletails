import { Gavel, History, Tag, Trash2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { SmartImage } from "@/components/ui/smart-image";
import { useListingHistory, type ListingHistoryRow } from "@/hooks/useAdmin";
import { thb } from "@/lib/cart";

function statusOf(row: ListingHistoryRow) {
  if (row.order_status === "completed") return { label: "ขายสำเร็จ", tone: "success" as const };
  if (row.order_status === "shipped") return { label: "จัดส่งแล้ว", tone: "success" as const };
  if (row.order_status === "paid") return { label: "ชำระเงินแล้ว", tone: "success" as const };
  if (row.order_status === "pending") return { label: "รอลูกค้าชำระเงิน", tone: "warn" as const };
  if (row.card_status === "sold") return { label: "ขายแล้ว", tone: "success" as const };
  if (row.card_status === "locked") return { label: "ถูกจอง", tone: "warn" as const };
  return { label: "ยังไม่ขาย", tone: "muted" as const };
}

const TONE: Record<"success" | "warn" | "muted", string> = {
  success: "bg-primary/10 text-primary",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  muted: "bg-secondary text-muted-foreground",
};

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" }) : "—";

/** ประวัติการลงขายทั้งหมดของร้าน คงอยู่แม้สินค้าถูกลบออกจากร้านแล้ว */
export function ListingHistory() {
  const history = useListingHistory();
  const rows = history.data ?? [];

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">ประวัติการลงขายทั้งหมด</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        รายการที่คุณเคยลงขาย จะยังคงอยู่ในประวัตินี้พร้อมสถานะ แม้จะลบสินค้าออกจากร้านไปแล้ว
      </p>

      {history.isLoading ? (
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : rows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          ยังไม่มีประวัติการลงขาย
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => {
            const status = statusOf(row);
            return (
              <li key={row.id} className="rounded-2xl border border-border bg-card p-3 sm:p-4">
                <div className="flex items-start gap-3">
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-secondary">
                    {row.image_url && (
                      <SmartImage
                        src={row.image_url}
                        alt={row.name}
                        transformWidth={140}
                        className="object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-sm font-semibold">{row.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[row.set_name, row.grade, row.condition].filter(Boolean).join(" • ") || "—"}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5">
                        {row.sale_type === "auction" ? (
                          <Gavel className="h-3 w-3" />
                        ) : (
                          <Tag className="h-3 w-3" />
                        )}
                        {row.sale_type === "auction" ? "ประมูล" : "ราคาปกติ"}
                      </span>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 ${TONE[status.tone]}`}>
                        {status.label}
                      </span>
                      {row.deleted_at && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                          <Trash2 className="h-3 w-3" />
                          ลบออกจากร้านแล้ว
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      ลงขาย {fmtDate(row.listed_at)}
                      {row.sold_at ? ` • ขายได้ ${fmtDate(row.sold_at)}` : ""}
                      {row.deleted_at ? ` • ลบ ${fmtDate(row.deleted_at)}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-right font-display text-sm font-semibold">
                    {thb.format(row.final_price ?? row.price)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
