import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/** ปุ่มย้อนกลับ — กลับหน้าก่อนหน้า หรือไปหน้าแรกถ้าไม่มีประวัติ */
export function BackButton({
  className,
  label = "ย้อนกลับ",
  iconOnly = false,
}: {
  className?: string;
  label?: string;
  /** ลูกศรกลมอย่างเดียว (ใช้ในหัวหน้าเพจ) ยังมี aria-label ให้โปรแกรมอ่านจอ */
  iconOnly?: boolean;
}) {
  const router = useRouter();

  const goBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
      return;
    }
    void router.navigate({ to: "/" });
  };

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={cn(
        "inline-flex items-center rounded-full border border-border bg-card/80 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary",
        iconOnly
          ? "h-12 w-12 justify-center bg-card shadow-[0_8px_24px_-16px_color-mix(in_oklch,var(--primary)_45%,transparent)]"
          : "min-h-10 gap-1.5 pr-4 pl-2.5",
        className,
      )}
    >
      <ChevronLeft className={iconOnly ? "h-5 w-5" : "h-4 w-4"} />
      {!iconOnly && label}
    </button>
  );
}
