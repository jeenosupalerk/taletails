import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "@tanstack/react-router";
import { Command } from "cmdk";
import {
  ArrowRight,
  ChartLine,
  Clock,
  Coins,
  CornerDownLeft,
  Gavel,
  Heart,
  Home,
  LayoutDashboard,
  LayoutGrid,
  Loader2,
  LogIn,
  MapPin,
  Newspaper,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingBag,
  Store,
  TrendingDown,
  TrendingUp,
  Trophy,
  Truck,
  User,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { SmartImage } from "@/components/ui/smart-image";
import { useIsAdmin } from "@/hooks/useAdmin";
import { pad, useCountdown } from "@/hooks/useCountdown";
import {
  GROUP_LABEL,
  GROUP_ORDER,
  MENU_ITEMS,
  useGlobalSearch,
  type SearchGroup,
  type SearchResult,
} from "@/hooks/useGlobalSearch";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  gavel: Gavel,
  store: Store,
  chart: ChartLine,
  shield: ShieldCheck,
  news: Newspaper,
  bag: ShoppingBag,
  receipt: Receipt,
  truck: Truck,
  trophy: Trophy,
  heart: Heart,
  coins: Coins,
  map: MapPin,
  user: User,
  package: Package,
  login: LogIn,
  dashboard: LayoutDashboard,
  users: Users,
  clock: Clock,
};

const GROUP_META: Record<SearchGroup, { icon: LucideIcon; tone: string }> = {
  market: { icon: Store, tone: "bg-primary" },
  auction: { icon: Gavel, tone: "bg-[var(--cd-urgent)]" },
  stats: { icon: ChartLine, tone: "bg-accent" },
  news: { icon: Newspaper, tone: "bg-chart-4" },
  menu: { icon: LayoutGrid, tone: "bg-foreground/70" },
};

/** จำนวนรายการต่อกลุ่มในแท็บ "ทั้งหมด" */
const PER_GROUP = 3;
const RECENT_KEY = "tt-recent-searches";
const QUICK_MENU = ["m-auctions", "m-market", "m-stats", "m-orders", "m-wins", "m-wishlist"];

const thb = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const list = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(list) ? list.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    window.localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, 6)));
  } catch {
    /* ignore — storage อาจถูกปิดในโหมดส่วนตัว */
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** ไฮไลต์คำที่ตรงกับคำค้น (ไม่สนตัวพิมพ์เล็ก/ใหญ่) */
function Highlight({ text, tokens }: { text: string; tokens: string[] }) {
  if (!tokens.length || !text) return <>{text}</>;
  const re = new RegExp(`(${tokens.map(escapeRegExp).sort((a, b) => b.length - a.length).join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[5px] bg-primary/15 px-0.5 font-semibold text-primary dark:bg-primary/25"
          >
            {part}
          </mark>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function LiveLeft({ endTime }: { endTime: string }) {
  const c = useCountdown(endTime);
  if (!c) return <span className="tabular-nums">--:--:--</span>;
  if (c.isFinished) return <span>หมดเวลา</span>;
  if (c.days >= 1) return <span>เหลือ {c.days} วัน</span>;
  return (
    <span className="tabular-nums">
      {pad(c.hours)}:{pad(c.minutes)}:{pad(c.seconds)}
    </span>
  );
}

function RightSide({ r }: { r: SearchResult }) {
  const right = r.right;
  if (!right) return null;
  switch (right.kind) {
    case "price":
      return (
        <div className="text-right">
          <p className="font-display text-sm font-semibold tabular-nums">{thb.format(right.price)}</p>
          {right.note && <p className="text-[11px] text-muted-foreground">{right.note}</p>}
        </div>
      );
    case "live":
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-[var(--cd-urgent)]/10 px-2 py-0.5 text-[11px] font-bold text-[var(--cd-urgent)]">
          <span className="h-1.5 w-1.5 rounded-full bg-current" />
          <LiveLeft endTime={right.endTime} />
        </span>
      );
    case "ended":
      return (
        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
          {right.label}
        </span>
      );
    case "change": {
      const up = right.pct >= 0;
      const Icon = up ? TrendingUp : TrendingDown;
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1 text-sm font-semibold tabular-nums",
            up ? "text-success" : "text-destructive",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {up ? "+" : ""}
          {right.pct.toFixed(1)}%
        </span>
      );
    }
  }
}

function Thumb({ r }: { r: SearchResult }) {
  if (r.image) {
    return (
      <SmartImage
        src={r.image}
        alt=""
        transformWidth={80}
        wrapperClassName={cn(
          "shrink-0 overflow-hidden bg-tile",
          r.group === "stats" ? "h-11 w-11 rounded-xl" : "h-[52px] w-10 rounded-lg",
        )}
        placeholderClassName="rounded-lg"
        className="h-full w-full object-cover"
      />
    );
  }
  const Icon = (r.icon && ICONS[r.icon]) || GROUP_META[r.group].icon;
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-tile text-muted-foreground group-data-[selected=true]:text-primary">
      <Icon className="h-[18px] w-[18px]" />
    </span>
  );
}

function ResultItem({
  r,
  tokens,
  onPick,
}: {
  r: SearchResult;
  tokens: string[];
  onPick: (r: SearchResult) => void;
}) {
  return (
    <Command.Item
      value={r.id}
      onSelect={() => onPick(r)}
      className="group flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 outline-none transition-colors data-[selected=true]:bg-primary/[0.07] data-[selected=true]:ring-1 data-[selected=true]:ring-primary/25 dark:data-[selected=true]:bg-primary/[0.12]"
    >
      <Thumb r={r} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium leading-snug">
          <Highlight text={r.title} tokens={tokens} />
        </p>
        {r.subtitle && (
          <p className="truncate text-xs text-muted-foreground">
            <Highlight text={r.subtitle} tokens={tokens} />
          </p>
        )}
      </div>
      <div className="shrink-0">
        <RightSide r={r} />
      </div>
      <kbd className="ml-1 hidden shrink-0 items-center gap-1 rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold text-muted-foreground sm:group-data-[selected=true]:inline-flex">
        Enter <CornerDownLeft className="h-3 w-3" />
      </kbd>
    </Command.Item>
  );
}

function GroupHeading({
  group,
  count,
  onMore,
  title,
  icon,
  tone,
  action,
}: {
  group?: SearchGroup;
  count?: number;
  onMore?: (() => void) | undefined;
  title?: string;
  icon?: LucideIcon;
  tone?: string;
  action?: ReactNode;
}) {
  const Icon = icon ?? (group ? GROUP_META[group].icon : LayoutGrid);
  return (
    <div className="flex items-center gap-2 px-2.5 pt-1 pb-1.5 text-xs font-semibold text-muted-foreground">
      <span
        className={cn(
          "grid h-[22px] w-[22px] place-items-center rounded-[7px] text-white",
          tone ?? (group ? GROUP_META[group].tone : "bg-muted-foreground"),
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span>
        {title ?? (group ? GROUP_LABEL[group] : "")}
        {count !== undefined && <span className="font-normal opacity-70"> · {count}</span>}
      </span>
      {onMore && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onMore}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold text-primary hover:bg-primary/10"
        >
          ดูทั้งหมด <ArrowRight className="h-3 w-3" />
        </button>
      )}
      {action}
    </div>
  );
}

const KeyHint = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-[10px] font-semibold">
    {children}
  </kbd>
);

/**
 * ค้นหาทั้งเว็บแบบ command palette (⌘K / Ctrl+K)
 * ผลลัพธ์แบ่งตามเมนูของเว็บ พร้อมหัวข้อบอกว่ามาจากเมนูไหน
 */
export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  // คีย์ลัดเปิด/ปิด: ⌘K / Ctrl+K และ "/" (เมื่อไม่ได้พิมพ์อยู่ในช่องอื่น)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onOpenChange(!open);
        return;
      }
      if (e.key === "/" && !open) {
        const el = e.target as HTMLElement | null;
        const typing =
          !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
        if (!typing) {
          e.preventDefault();
          onOpenChange(true);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-background/55 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 dark:bg-black/60" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[60] flex flex-col bg-background outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 sm:inset-auto sm:top-[8vh] sm:left-1/2 sm:w-[min(640px,calc(100%-2rem))] sm:-translate-x-1/2 sm:bg-transparent sm:data-[state=open]:slide-in-from-top-2"
        >
          <DialogPrimitive.Title className="sr-only">ค้นหาทั้งเว็บ</DialogPrimitive.Title>
          {open && <SearchBody onClose={() => onOpenChange(false)} />}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

function SearchBody({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const { isAdmin } = useIsAdmin();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | SearchGroup>("all");
  const [recent, setRecent] = useState<string[]>([]);
  const [isMac, setIsMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRecent(readRecent());
    setIsMac(/Mac|iPhone|iPad/i.test(navigator.userAgent));
  }, []);

  const { results, tokens, isLoading } = useGlobalSearch(query, {
    enabled: true,
    isAdmin,
    isAuthenticated,
  });

  const byGroup = useMemo(() => {
    const map = new Map<SearchGroup, SearchResult[]>();
    for (const r of results) {
      const list = map.get(r.group);
      if (list) list.push(r);
      else map.set(r.group, [r]);
    }
    return map;
  }, [results]);

  // กลับไปแท็บ "ทั้งหมด" เมื่อพิมพ์คำใหม่แล้วแท็บเดิมไม่มีผล
  useEffect(() => {
    if (tab !== "all" && !byGroup.has(tab)) setTab("all");
  }, [byGroup, tab]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [tab, query]);

  const pick = useCallback(
    (r: SearchResult) => {
      const term = query.trim();
      if (term) {
        const next = [term, ...readRecent().filter((x) => x.toLowerCase() !== term.toLowerCase())];
        writeRecent(next);
      }
      onClose();
      router.history.push(r.href);
    },
    [query, onClose, router],
  );

  const removeRecent = (term: string) => {
    const next = recent.filter((x) => x !== term);
    setRecent(next);
    writeRecent(next);
  };

  const hasQuery = tokens.length > 0 || query.trim().length > 0;
  const groups = GROUP_ORDER.filter((g) => byGroup.has(g) && (tab === "all" || tab === g));
  const quick = MENU_ITEMS.filter((m) => QUICK_MENU.includes(m.id));

  return (
    <Command
      shouldFilter={false}
      loop
      label="ค้นหาทั้งเว็บ"
      className="flex min-h-0 flex-1 flex-col gap-2.5 sm:flex-none"
    >
      {/* ช่องค้นหา */}
      <div className="flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:p-0">
        <div className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-card/95 px-4 py-2.5 shadow-[0_0_0_1px_color-mix(in_oklch,var(--primary)_35%,transparent),0_0_0_5px_color-mix(in_oklch,var(--primary)_10%,transparent),0_24px_50px_-24px_rgba(60,40,20,0.35)] backdrop-blur-xl sm:rounded-3xl sm:px-5 sm:py-4">
          <Search className="h-5 w-5 shrink-0 text-primary sm:h-6 sm:w-6" />
          <div className="min-w-0 flex-1">
            <p className="hidden text-[11px] text-muted-foreground sm:block">
              ค้นหาอะไรก็ได้ การ์ด ชุด รหัส เกรด ข่าว หรือเมนู…
            </p>
            <Command.Input
              ref={inputRef}
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="ค้นหาการ์ด ชุด รหัส ข่าว หรือเมนู…"
              className="w-full bg-transparent text-base font-medium outline-none placeholder:text-muted-foreground/70 sm:text-xl sm:placeholder:text-base"
            />
          </div>
          {isLoading && hasQuery && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-muted-foreground" />
          )}
          {query && (
            <button
              type="button"
              aria-label="ล้างคำค้น"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <kbd className="hidden shrink-0 rounded-lg border border-border bg-tile px-2 py-1 font-sans text-xs font-semibold text-muted-foreground sm:inline-block">
            {isMac ? "⌘ K" : "Ctrl K"}
          </kbd>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 px-1 text-sm font-semibold text-primary sm:hidden"
        >
          ยกเลิก
        </button>
      </div>

      {/* ผลลัพธ์ */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-none sm:rounded-3xl sm:bg-card/95 sm:shadow-[0_0_0_1px_var(--border),0_30px_60px_-30px_rgba(60,40,20,0.4)] sm:backdrop-blur-xl">
        {hasQuery && results.length > 0 && (
          <div className="no-scrollbar flex shrink-0 gap-1.5 overflow-x-auto border-b border-border px-3 py-2.5 sm:px-3">
            {(["all", ...GROUP_ORDER.filter((g) => byGroup.has(g))] as const).map((t) => {
              const count = t === "all" ? results.length : (byGroup.get(t)?.length ?? 0);
              return (
                <button
                  key={t}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setTab(t)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    tab === t
                      ? "bg-foreground text-background"
                      : "bg-tile text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t === "all" ? "ทั้งหมด" : GROUP_LABEL[t]}
                  <span className="ml-1 opacity-60">{count}</span>
                </button>
              );
            })}
          </div>
        )}

        <Command.List
          ref={listRef}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2 sm:max-h-[min(62vh,560px)]"
        >
          {!hasQuery ? (
            <>
              {recent.length > 0 && (
                <Command.Group
                  className="pt-2.5"
                  heading={
                    <GroupHeading
                      title="ค้นหาล่าสุด"
                      icon={Clock}
                      tone="bg-muted-foreground"
                      action={
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRecent([]);
                            writeRecent([]);
                          }}
                          className="ml-auto rounded-full px-2 py-0.5 hover:bg-muted"
                        >
                          ล้าง
                        </button>
                      }
                    />
                  }
                >
                  {recent.map((term) => (
                    <Command.Item
                      key={term}
                      value={`recent-${term}`}
                      onSelect={() => setQuery(term)}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl px-2.5 py-2 outline-none data-[selected=true]:bg-primary/[0.07] data-[selected=true]:ring-1 data-[selected=true]:ring-primary/25"
                    >
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-tile text-muted-foreground">
                        <Clock className="h-[18px] w-[18px]" />
                      </span>
                      <span className="flex-1 truncate text-[15px] font-medium">{term}</span>
                      <button
                        type="button"
                        aria-label={`ลบ ${term} ออกจากประวัติ`}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecent(term);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              <Command.Group
                className="pt-2.5"
                heading={<GroupHeading group="menu" title="ไปที่เมนู" count={quick.length} />}
              >
                {quick.map((r) => (
                  <ResultItem key={r.id} r={r} tokens={[]} onPick={pick} />
                ))}
              </Command.Group>
            </>
          ) : results.length === 0 ? (
            isLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> กำลังค้นหา…
              </div>
            ) : (
              <Command.Empty className="px-6 py-12 text-center">
                <p className="font-display text-base font-semibold">ไม่พบผลลัพธ์สำหรับ “{query.trim()}”</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  ลองใช้ชื่อการ์ด ชื่อชุด รหัสการ์ด หรือเกรด เช่น “PSA 10”
                </p>
              </Command.Empty>
            )
          ) : (
            groups.map((g) => {
              const items = byGroup.get(g) ?? [];
              const limit = tab === "all" ? PER_GROUP : 30;
              const shown = items.slice(0, limit);
              return (
                <Command.Group
                  key={g}
                  className="pt-2.5"
                  heading={
                    <GroupHeading
                      group={g}
                      count={items.length}
                      onMore={items.length > shown.length ? () => setTab(g) : undefined}
                    />
                  }
                >
                  {shown.map((r) => (
                    <ResultItem key={r.id} r={r} tokens={tokens} onPick={pick} />
                  ))}
                </Command.Group>
              );
            })
          )}
        </Command.List>

        <div className="hidden shrink-0 items-center gap-4 border-t border-border bg-muted/40 px-4 py-2.5 text-xs text-muted-foreground sm:flex">
          <span className="flex items-center gap-1">
            <KeyHint>↑</KeyHint>
            <KeyHint>↓</KeyHint> เลื่อน
          </span>
          <span className="flex items-center gap-1">
            <KeyHint>Enter</KeyHint> เปิด
          </span>
          <span className="flex items-center gap-1">
            <KeyHint>Esc</KeyHint> ปิด
          </span>
          {hasQuery && results.length > 0 && <span className="ml-auto">พบ {results.length} ผลลัพธ์</span>}
        </div>
      </div>
    </Command>
  );
}

/** ปุ่มเปิดค้นหาบนหัวเว็บ (เดสก์ท็อป) — หน้าตาเหมือนช่องค้นหาเดิม */
export function SearchTrigger({ onOpen, className }: { onOpen: () => void; className?: string }) {
  const [isMac, setIsMac] = useState(true);
  useEffect(() => setIsMac(/Mac|iPhone|iPad/i.test(navigator.userAgent)), []);
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="ค้นหาทั้งเว็บ"
      aria-keyshortcuts="Meta+K Control+K"
      className={cn(
        "group flex min-h-10 w-full items-center gap-2 rounded-full border border-border bg-white pr-2 pl-3 text-left text-sm text-muted-foreground transition-[border-color,box-shadow] hover:border-primary/40 hover:shadow-[0_0_0_4px_color-mix(in_oklch,var(--primary)_10%,transparent)] dark:bg-card",
        className,
      )}
    >
      <Search className="h-4 w-4 shrink-0 group-hover:text-primary" />
      <span className="flex-1 truncate">ค้นหาการ์ด ชุด หรือรหัสการ์ด…</span>
      <kbd className="shrink-0 rounded-md border border-border bg-tile px-1.5 py-0.5 font-sans text-[11px] font-semibold">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
