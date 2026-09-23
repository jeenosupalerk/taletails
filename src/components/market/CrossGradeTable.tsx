import { Link } from "@tanstack/react-router";
import { ArrowRight, Gavel } from "lucide-react";

import type { MarketCard } from "@/data/market";
import { formatThb } from "@/data/market";
import type { ActiveListing } from "@/hooks/useMarketListings";
import { splitGrade } from "@/lib/market-price";
import { cn } from "@/lib/utils";

type Group = "th" | "intl" | "raw";

interface Row {
  card: MarketCard;
  price: number;
  group: Group;
  company: string;
  value: string;
  pct: number | null;
  listings: ActiveListing[];
}

const GROUP_LABEL: Record<Group, string> = { th: "เกรดไทย", intl: "ต่างประเทศ", raw: "ไม่เกรด" };

/** คีย์ "การ์ดใบเดียวกัน" ไม่สนเกรด (ชื่อ|ชุด) — ตัดส่วนเกรดออกจาก cardKey */
const modelOf = (key?: string) => (key ? key.split("|").slice(0, 2).join("|") : "");

function Badge({ row }: { row: Row }) {
  if (row.group === "raw" || !/^\d+(\.\d+)?$/.test(row.value)) {
    return (
      <span className="grid h-11 min-w-11 place-items-center rounded-[10px] bg-card px-1.5 font-display text-[11px] font-bold uppercase ring-1 ring-border">
        {row.value && row.group !== "raw" ? row.value : "RAW"}
      </span>
    );
  }
  return (
    <span
      className={cn(
        "flex h-11 min-w-11 flex-col items-center justify-center rounded-[10px] px-1.5 leading-none text-white",
        row.group === "th"
          ? "bg-gradient-to-br from-[oklch(0.62_0.19_40)] to-[oklch(0.5_0.17_32)]"
          : "bg-[oklch(0.3_0.03_50)]",
      )}
    >
      {row.company && <span className="mb-0.5 text-[8px] font-bold tracking-wider opacity-80">{row.company}</span>}
      <span className="font-display text-lg font-extrabold">{row.value}</span>
    </span>
  );
}

function ForSale({ listings }: { listings: ActiveListing[] }) {
  if (!listings.length) {
    return (
      <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-muted-foreground">
        ยังไม่มีขาย
      </span>
    );
  }
  const fixed = listings.filter((l) => l.kind === "fixed");
  const first = listings[0]!;
  const cls =
    "relative z-10 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-primary hover:bg-primary/15";
  return first.kind === "fixed" ? (
    <Link to="/product/$id" params={{ id: first.cardId }} className={cls}>
      มีขาย {fixed.length} ใบ · {formatThb(fixed[0]!.price)} <ArrowRight className="h-3 w-3" />
    </Link>
  ) : (
    <Link to="/card/$id" params={{ id: first.cardId }} className={cls}>
      <Gavel className="h-3 w-3" /> ประมูลอยู่ {listings.length}
    </Link>
  );
}

/**
 * ตารางเทียบราคาการ์ดใบเดียวกัน (ชื่อ + ชุด) ในทุกเกรดที่เคยขายได้
 * ฐานเทียบ = PSA 10 ถ้ามี ไม่งั้นใช้เกรดที่ราคาสูงสุด
 */
export function CrossGradeTable({
  current,
  cards,
  listingsByKey,
}: {
  current: MarketCard;
  cards: MarketCard[];
  listingsByKey: Map<string, ActiveListing[]>;
}) {
  const model = modelOf(current.key);
  if (!model) return null;

  const base: Omit<Row, "pct">[] = cards
    .filter((c) => modelOf(c.key) === model)
    .map((c) => {
      const { company, value } = splitGrade(c.grade);
      const group: Group = company === "SQC" ? "th" : company ? "intl" : "raw";
      return {
        card: c,
        price: c.marketPrice ?? c.lastPrice,
        group,
        company,
        value: value === "Raw" ? "" : value,
        listings: listingsByKey.get(c.key ?? "") ?? [],
      };
    })
    .sort((a, b) => b.price - a.price);

  if (base.length < 2) return null;

  const ref =
    base.find((r) => r.company === "PSA" && r.value === "10") ?? base[0]!;
  const refLabel = ref.company ? `${ref.company} ${ref.value}` : "Raw";
  const rows: Row[] = base.map((r) => ({
    ...r,
    pct: r === ref || !ref.price ? null : ((r.price - ref.price) / ref.price) * 100,
  }));
  const max = rows[0]!.price || 1;
  const cur = rows.find((r) => r.card.id === current.id) ?? rows[0]!;
  const curLabel = cur.company ? `${cur.company} ${cur.value}` : "Raw";
  const raw = rows.find((r) => r.group === "raw");

  const insights: { label: string; value: string }[] = [];
  if (cur !== ref && ref.price) {
    insights.push({ label: `${curLabel} เทียบ ${refLabel}`, value: `ราว ${Math.round((cur.price / ref.price) * 100)}% ของราคา ${refLabel}` });
  }
  if (raw && cur !== raw && raw.price) {
    insights.push({ label: `${curLabel} เทียบ Raw`, value: `สูงกว่า Raw ${(cur.price / raw.price).toFixed(1)} เท่า` });
  }
  if (cur !== ref) {
    insights.push({ label: `ส่วนต่าง ${curLabel} → ${refLabel}`, value: formatThb(Math.abs(ref.price - cur.price)) });
  }

  const pctText = (r: Row) =>
    r.pct === null ? "ฐานเทียบ" : `${r.pct > 0 ? "+" : ""}${r.pct.toFixed(0)}%`;
  const pctCls = (r: Row) =>
    r.pct === null ? "text-muted-foreground" : r.pct < 0 ? "text-destructive" : "text-success";

  return (
    <section className="surface-panel p-4 sm:p-5" aria-labelledby="xgrade-title">
      <h3 id="xgrade-title" className="font-display text-base font-bold">
        ราคาการ์ดนี้ในแต่ละเกรด
      </h3>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {current.cardName} · {current.setName} — ราคาตลาดของแต่ละเกรดคำนวณแยกกัน (เฉลี่ย 3 ครั้งล่าสุดภายใน 90 วัน)
        · กดแถวเพื่อดูสถิติเกรดนั้น
      </p>

      {insights.length > 0 && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {insights.map((x) => (
            <div key={x.label} className="rounded-xl bg-tile px-3 py-2.5">
              <p className="text-[11px] text-muted-foreground">{x.label}</p>
              <p className="text-sm font-bold">{x.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* หัวตาราง (เดสก์ท็อป) */}
      <div className="mt-4 hidden grid-cols-[150px_1fr_100px_90px_70px_150px] gap-3 px-2.5 pb-1.5 text-[11px] font-semibold text-muted-foreground md:grid">
        <span>เกรด</span>
        <span>เทียบราคา</span>
        <span className="text-right">ราคาตลาด</span>
        <span className="text-right">เทียบ {refLabel}</span>
        <span className="text-right">ขายแล้ว</span>
        <span className="text-right">ในตลาดตอนนี้</span>
      </div>

      <ul className="mt-2 space-y-1 md:mt-0">
        {rows.map((r) => {
          const isCur = r === cur;
          return (
            <li
              key={r.card.id}
              className={cn(
                "relative rounded-xl px-2.5 py-2.5 transition-colors hover:bg-secondary/50",
                isCur && "bg-primary/[0.06] ring-1 ring-primary/35 ring-inset hover:bg-primary/[0.08]",
              )}
            >
              {/* ทั้งแถวกดได้ → สถิติเกรดนั้น (ลิงก์ซื้อด้านขวาอยู่ชั้นบน) */}
              <Link
                to="/market/$id"
                params={{ id: r.card.id }}
                aria-label={`ดูสถิติ ${r.card.cardName} ${r.company} ${r.value}`}
                aria-current={isCur ? "page" : undefined}
                className="absolute inset-0 rounded-xl"
              />
              <div className="flex items-center gap-3 md:grid md:grid-cols-[150px_1fr_100px_90px_70px_150px]">
                <div className="flex shrink-0 items-center gap-2">
                  <Badge row={r} />
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-[10.5px] font-bold whitespace-nowrap sm:inline",
                      r.group === "th" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {GROUP_LABEL[r.group]}
                  </span>
                </div>

                {/* มือถือ: รวมข้อมูลเป็นกองเดียว */}
                <div className="min-w-0 flex-1 md:contents">
                  <div className="flex items-baseline justify-between md:hidden">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10.5px] font-bold sm:hidden",
                        r.group === "th" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {GROUP_LABEL[r.group]}
                    </span>
                    <span className="ml-auto font-display text-[15px] font-bold tabular-nums">{formatThb(r.price)}</span>
                  </div>
                  <div className="my-1.5 h-2.5 overflow-hidden rounded-full bg-tile md:my-0" aria-hidden>
                    <div
                      className={cn(
                        "h-full rounded-full",
                        r.group === "th" ? "bg-gradient-ember" : "bg-muted-foreground/40",
                      )}
                      style={{ width: `${Math.max(4, (r.price / max) * 100)}%` }}
                    />
                  </div>
                  <span className="hidden text-right font-display text-[15px] font-bold tabular-nums md:block">
                    {formatThb(r.price)}
                  </span>
                  <span className={cn("hidden text-right text-xs font-bold tabular-nums md:block", pctCls(r))}>
                    {pctText(r)}
                  </span>
                  <span className="hidden text-right text-xs text-muted-foreground md:block">{r.card.totalSold} ครั้ง</span>
                  <div className="hidden justify-end md:flex">
                    <ForSale listings={r.listings} />
                  </div>
                  <div className="flex items-center justify-between gap-2 text-[11px] md:hidden">
                    <span className="text-muted-foreground">ขาย {r.card.totalSold} ครั้ง</span>
                    <span className={cn("font-bold", pctCls(r))}>
                      {r.pct === null ? "ฐานเทียบ" : `${pctText(r)} vs ${refLabel}`}
                    </span>
                  </div>
                  {r.listings.length > 0 && (
                    <div className="mt-1.5 md:hidden">
                      <ForSale listings={r.listings} />
                    </div>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
        แถวที่มีกรอบส้ม = เกรดที่กำลังดูอยู่ · ฐานเทียบใช้ PSA 10 เพราะเป็นราคาอ้างอิงที่คนสะสมทั่วโลกยอมรับ
        (ถ้าการ์ดใบนี้ไม่มี PSA 10 จะใช้เกรดที่ราคาสูงสุดแทน) · แสดงเฉพาะเกรดที่เคยขายได้จริง
      </p>
    </section>
  );
}
