import { useState, type ReactNode } from "react";
import { toast } from "sonner";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthDialog({ trigger }: { trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"login" | "signup">("login");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-3xl sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex items-center gap-2.5">
            <img
              src={taletailsLogo}
              alt=""
              width={36}
              height={36}
              className="min-h-9 w-9 rounded-xl object-cover"
            />
            <span className="font-display text-lg font-bold">
              Tale<span className="text-gradient-ember">tails</span>
            </span>
          </div>
          <DialogTitle>{mode === "login" ? "เข้าสู่ระบบ" : "สมัครสมาชิก"}</DialogTitle>
          <DialogDescription>
            เข้าสู่ระบบเพื่อเสนอราคาในห้องประมูลสด และติดตามการ์ดที่คุณสนใจ
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setOpen(false);
            toast.success(mode === "login" ? "เข้าสู่ระบบสำเร็จ" : "สมัครสมาชิกสำเร็จ");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="auth-email">อีเมล</Label>
            <Input
              id="auth-email"
              type="email"
              required
              placeholder="you@example.com"
              className="min-h-11 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">รหัสผ่าน</Label>
            <Input
              id="auth-password"
              type="password"
              required
              placeholder="••••••••"
              className="min-h-11 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            className="min-h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90"
          >
            {mode === "login" ? "เข้าสู่ระบบ" : "สร้างบัญชี"}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => setMode((m) => (m === "login" ? "signup" : "login"))}
          className="text-center text-sm text-muted-foreground transition-colors hover:text-primary"
        >
          {mode === "login" ? "ยังไม่มีบัญชี? สมัครสมาชิก" : "มีบัญชีแล้ว? เข้าสู่ระบบ"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
