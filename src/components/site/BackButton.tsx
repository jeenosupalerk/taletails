import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";

import { cn } from "@/lib/utils";

/** ปุ่มย้อนกลับ — กลับหน้าก่อนหน้า หรือไปหน้าแรกถ้าไม่มีประวัติ */
export function BackButton({ className, label = "ย้อนกลับ" }: { className?: string; label?: string }) {
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
        "inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card/80 pr-4 pl-2.5 text-sm font-semibold text-foreground backdrop-blur transition-colors hover:border-primary/50 hover:text-primary",
        className,
      )}
    >
      <ChevronLeft className="h-4 w-4" />
      {label}
    </button>
  );
}
