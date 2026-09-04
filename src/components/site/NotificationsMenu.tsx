import { Bell, Gavel, Package, Receipt, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/useNotifications";

const ICONS: Record<string, typeof Bell> = {
  auction_won: Gavel,
  auction: Sparkles,
  order: Receipt,
  shipping: Package,
};

function relative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "เมื่อสักครู่";
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
  return `${Math.floor(h / 24)} วันที่แล้ว`;
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { items, unread } = useNotifications();
  const markRead = useMarkNotificationsRead();

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next && unread > 0) {
          markRead.mutate(items.filter((n) => !n.read_at).map((n) => n.id));
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative h-11 w-11">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(20rem,calc(100vw-1.5rem))] rounded-2xl p-0"
      >

        <div className="border-b border-border px-4 py-3">
          <p className="font-display text-sm font-bold">การแจ้งเตือน</p>
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
        ) : (
          <ul className="max-h-96 divide-y divide-border overflow-y-auto">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const content = (
                <>
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{n.title}</p>
                    <p className="line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                      {relative(n.created_at)}
                    </p>
                  </div>
                </>
              );
              return (
                <li key={n.id} className={n.read_at ? "" : "bg-primary/[0.04]"}>
                  {n.link ? (
                    <a
                      href={n.link}
                      onClick={() => setOpen(false)}
                      className="flex gap-3 px-4 py-3 transition-colors hover:bg-secondary/60"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex gap-3 px-4 py-3">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
