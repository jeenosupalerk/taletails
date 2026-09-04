import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, Gavel, Package, Receipt, Sparkles, TrendingUp } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  useMarkNotificationsRead,
  useNotifications,
  type NotificationRow,
} from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const ICONS: Record<string, typeof Bell> = {
  auction_won: Gavel,
  auction_outbid: TrendingUp,
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
  const navigate = useNavigate();

  const openItem = (n: NotificationRow) => {
    // ทำเครื่องหมายว่าอ่านแล้วทันที (optimistic) แล้วค่อยนำทางแบบไม่รีโหลดหน้า
    if (!n.read_at) markRead.mutate([n.id]);
    setOpen(false);
    if (n.link) void navigate({ href: n.link });
  };

  const markAll = () => {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length) markRead.mutate(ids);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="การแจ้งเตือน" className="relative min-h-11 w-11">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-glow">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        collisionPadding={12}
        className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-2xl p-0"
      >
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold">การแจ้งเตือน</p>
            {unread > 0 && (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                ยังไม่อ่าน {unread}
              </span>
            )}
          </div>
          {unread > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={markAll}
              disabled={markRead.isPending}
              className="min-h-10 gap-1.5 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              อ่านทั้งหมด
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell className="mx-auto mb-2 h-6 w-6 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">ยังไม่มีการแจ้งเตือน</p>
          </div>
        ) : (
          <ul className="max-h-96 divide-y divide-border/70 overflow-y-auto">
            {items.map((n) => {
              const Icon = ICONS[n.type] ?? Bell;
              const isUnread = !n.read_at;
              return (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => openItem(n)}
                    aria-label={`${isUnread ? "ยังไม่อ่าน: " : ""}${n.title}`}
                    className={cn(
                      "relative flex w-full gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                      isUnread
                        ? "bg-primary/[0.07] hover:bg-primary/[0.12]"
                        : "bg-transparent hover:bg-secondary/60",
                    )}
                  >
                    {isUnread && (
                      <span
                        aria-hidden
                        className="absolute inset-y-0 left-0 w-0.5 bg-gradient-ember"
                      />
                    )}
                    <span
                      className={cn(
                        "mt-0.5 grid min-h-9 w-9 shrink-0 place-items-center rounded-full",
                        isUnread
                          ? "bg-gradient-ember text-primary-foreground shadow-glow"
                          : "bg-secondary text-muted-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            isUnread ? "font-bold text-foreground" : "font-medium text-muted-foreground",
                          )}
                        >
                          {n.title}
                        </p>
                        {isUnread && (
                          <span
                            aria-hidden
                            className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary shadow-glow"
                          />
                        )}
                      </div>
                      <p
                        className={cn(
                          "line-clamp-2 text-xs",
                          isUnread ? "text-foreground/80" : "text-muted-foreground/80",
                        )}
                      >
                        {n.body}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                        {relative(n.created_at)}
                        {!isUnread && " · อ่านแล้ว"}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
