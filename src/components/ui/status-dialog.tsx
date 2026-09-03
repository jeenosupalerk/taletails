import * as React from "react";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type StatusDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone?: "success" | "warning" | "info";
  title: string;
  description?: React.ReactNode;
  /** เนื้อหาเพิ่มเติม เช่น สรุปยอด / เลขคำสั่งซื้อ */
  children?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

const TONE = {
  success: { Icon: CheckCircle2, cls: "bg-emerald-500/12 text-emerald-500" },
  warning: { Icon: AlertTriangle, cls: "bg-amber-500/12 text-amber-500" },
  info: { Icon: Info, cls: "bg-primary/12 text-primary" },
} as const;

/** Modal แสดงผลลัพธ์ (สำเร็จ/เตือน) สำหรับ login, สมัครสมาชิก และการชำระเงิน */
export function StatusDialog({
  open,
  onOpenChange,
  tone = "success",
  title,
  description,
  children,
  actionLabel = "ตกลง",
  onAction,
  secondaryLabel,
  onSecondary,
}: StatusDialogProps) {
  const { Icon, cls } = TONE[tone];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl text-center">
        <DialogHeader className="items-center space-y-3 text-center sm:text-center">
          <span className={cn("flex h-14 w-14 items-center justify-center rounded-2xl", cls)}>
            <Icon className="h-7 w-7" />
          </span>
          <DialogTitle className="font-display text-lg">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        {children ? <div className="text-sm text-muted-foreground">{children}</div> : null}

        <DialogFooter className="mt-2 flex-col gap-2 sm:flex-col">
          <Button
            className="h-11 w-full rounded-xl font-semibold"
            onClick={() => {
              onOpenChange(false);
              onAction?.();
            }}
          >
            {actionLabel}
          </Button>
          {secondaryLabel ? (
            <Button
              variant="outline"
              className="h-10 w-full rounded-xl"
              onClick={() => {
                onOpenChange(false);
                onSecondary?.();
              }}
            >
              {secondaryLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
