import { Bell, Gavel, Package, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const notifications = [
  {
    id: "n1",
    icon: Gavel,
    title: "คุณถูกเสนอราคาแซง",
    detail: "Charizard Base Set — ราคาปัจจุบัน ฿12,450",
    time: "2 นาทีที่แล้ว",
  },
  {
    id: "n2",
    icon: Sparkles,
    title: "การประมูลใกล้ปิด",
    detail: "Pikachu Illustrator เหลือเวลา 15 นาที",
    time: "15 นาทีที่แล้ว",
  },
  {
    id: "n3",
    icon: Package,
    title: "คำสั่งซื้อจัดส่งแล้ว",
    detail: "หมายเลขพัสดุ TT-1042288",
    time: "เมื่อวาน",
  },
];

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {notifications.length}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[19rem] rounded-2xl p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-display text-sm font-bold">การแจ้งเตือน</p>
        </div>
        <ul className="max-h-80 divide-y divide-border overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                <n.icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{n.title}</p>
                <p className="truncate text-xs text-muted-foreground">{n.detail}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/80">{n.time}</p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
