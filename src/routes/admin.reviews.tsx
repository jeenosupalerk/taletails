import { createFileRoute } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ReviewItem } from "@/components/reviews/ReviewBits";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminReviews, useSetReviewHidden } from "@/hooks/useShop";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/reviews")({
  component: AdminReviewsPage,
});

/** ซ่อนรีวิวที่ผิดกติกา (ด่า/โฆษณา/รูปไม่เหมาะสม) — ซ่อนแล้วคนทั่วไปไม่เห็น แต่เจ้าของร้านและผู้รีวิวยังเห็น */
function AdminReviewsPage() {
  const { data, isLoading, error } = useAdminReviews();
  const setHidden = useSetReviewHidden();
  const [filter, setFilter] = useState<"all" | "low" | "hidden">("all");
  const list = (data ?? []).filter((r) =>
    filter === "low" ? r.rating <= 2 : filter === "hidden" ? r.is_hidden : true,
  );
  const chip = (on: boolean) =>
    cn(
      "inline-flex min-h-10 items-center rounded-full border px-4 text-xs font-semibold",
      on
        ? "border-foreground bg-foreground text-background"
        : "border-border bg-card text-muted-foreground",
    );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip(filter === "all")} onClick={() => setFilter("all")}>
          ทั้งหมด {data?.length ?? 0}
        </button>
        <button type="button" className={chip(filter === "low")} onClick={() => setFilter("low")}>
          1-2 ดาว
        </button>
        <button
          type="button"
          className={chip(filter === "hidden")}
          onClick={() => setFilter("hidden")}
        >
          ที่ซ่อนอยู่ {(data ?? []).filter((r) => r.is_hidden).length}
        </button>
      </div>

      {isLoading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : error ? (
        <p className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
          โหลดรีวิวไม่สำเร็จ: {error.message}
        </p>
      ) : list.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          ยังไม่มีรีวิวในหมวดนี้
        </p>
      ) : (
        <ul className="space-y-3">
          {list.map((r) => (
            <li
              key={r.id}
              className={cn(
                "rounded-2xl border bg-card p-4",
                r.is_hidden ? "border-destructive/40 opacity-80" : "border-border",
              )}
            >
              <p className="mb-2 text-xs text-muted-foreground">
                ร้าน {r.seller?.username ?? r.seller_id.slice(0, 8)}
                {r.is_hidden && (
                  <span className="ml-2 font-semibold text-destructive">ซ่อนอยู่</span>
                )}
              </p>
              <ReviewItem
                review={r}
                footer={
                  <Button
                    variant="secondary"
                    className="min-h-11 rounded-xl"
                    disabled={setHidden.isPending}
                    onClick={() =>
                      setHidden.mutate(
                        { reviewId: r.id, hidden: !r.is_hidden },
                        {
                          onSuccess: () =>
                            toast.success(r.is_hidden ? "แสดงรีวิวแล้ว" : "ซ่อนรีวิวแล้ว"),
                          onError: (e) => toast.error(e.message),
                        },
                      )
                    }
                  >
                    {r.is_hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    {r.is_hidden ? "แสดงรีวิว" : "ซ่อนรีวิว"}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
