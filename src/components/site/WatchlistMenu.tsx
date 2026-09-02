import { Link } from "@tanstack/react-router";
import { Heart, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { thb } from "@/lib/cart";
import { useWatchlist } from "@/lib/watchlist";

export function WatchlistMenu() {
  const [open, setOpen] = useState(false);
  const { items, count, remove } = useWatchlist();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="รายการที่อยากได้" className="relative">
          <Heart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[19rem] rounded-2xl p-0">
        <div className="border-b border-border px-4 py-3">
          <p className="font-display text-sm font-bold">รายการที่อยากได้ ({count})</p>
        </div>

        {count === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            ยังไม่มีรายการ กด “เพิ่มลงรายการที่อยากได้” เพื่อติดตามการ์ดที่สนใจ
          </p>
        ) : (
          <ul className="max-h-80 divide-y divide-border overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 px-3 py-2.5 hover:bg-secondary/60">
                <Link
                  to={item.kind === "auction" ? "/auctions" : "/product/$id"}
                  {...(item.kind === "auction" ? {} : { params: { id: item.id } })}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    width={40}
                    height={53}
                    className="h-13 w-10 shrink-0 rounded-md border border-border object-cover"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{item.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {item.subtitle}
                    </span>
                    <span className="block text-xs font-bold text-primary">
                      {thb.format(item.price)}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  aria-label={`ลบ ${item.name} ออกจากรายการ`}
                  onClick={() => remove(item.id)}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-secondary"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
