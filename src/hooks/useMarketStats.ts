import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { MarketCard, MarketRange, PricePoint } from "@/data/market";
import { rangeDays } from "@/data/market";
import {
  cardKey,
  changeInWindow,
  gradeDisplay,
  marketPriceOf,
  type SalePoint,
} from "@/lib/market-price";

interface SaleRow {
  card_id: string;
  card_name: string;
  set_name: string | null;
  grade: string | null;
  /** มีเมื่อ apply SQL patch market_sales_v2 แล้ว — ใช้แยก PSA 10 กับ BGS 10 */
  grading_company?: string | null;
  image: string | null;
  is_auction: boolean;
  price: number;
  sold_at: string;
}

/** รายการขาย 1 ครั้ง (ใช้ในฟีด "ขายล่าสุด") */
export interface MarketSale {
  cardId: string;
  key: string;
  cardName: string;
  setName: string;
  grade: string;
  imageUrl: string;
  isAuction: boolean;
  price: number;
  soldAt: number;
}

export interface MarketSummary {
  totalVolume: number;
  totalTransactions: number;
  volumeChange24h: number;
}

export interface MarketStats {
  summary: MarketSummary;
  cards: MarketCard[];
  sales: MarketSale[];
  /** true = ยอดขายมีบริษัทเกรด → คีย์ต้องรวมบริษัทด้วย */
  keyWithCompany: boolean;
}

const DAY = 24 * 60 * 60 * 1000;
// ค่าว่างคงที่ — กันไม่ให้ memo ปลายทางคำนวณใหม่ทุก render ระหว่างโหลด
const EMPTY_CARDS: MarketCard[] = [];
const EMPTY_SALES: MarketSale[] = [];
const EMPTY_SUMMARY: MarketSummary = { totalVolume: 0, totalTransactions: 0, volumeChange24h: 0 };

function buildStats(rows: SaleRow[]): MarketStats {
  const now = Date.now();
  const keyWithCompany = rows.some((r) => "grading_company" in r);

  const sales: MarketSale[] = rows.map((r) => ({
    cardId: r.card_id,
    key: cardKey(
      { name: r.card_name, set: r.set_name, grade: r.grade, company: r.grading_company ?? null },
      keyWithCompany,
    ),
    cardName: r.card_name,
    setName: r.set_name || "ไม่ระบุชุด",
    grade: gradeDisplay(r.grade, r.grading_company ?? null) || "Raw",
    imageUrl: r.image || "",
    isAuction: r.is_auction,
    price: Number(r.price),
    soldAt: new Date(r.sold_at).getTime(),
  }));
  sales.sort((a, b) => b.soldAt - a.soldAt);

  const totalVolume = sales.reduce((sum, r) => sum + r.price, 0);
  const vol24 = sales.filter((r) => now - r.soldAt <= DAY).reduce((s, r) => s + r.price, 0);
  const volPrev24 = sales
    .filter((r) => now - r.soldAt > DAY && now - r.soldAt <= 2 * DAY)
    .reduce((s, r) => s + r.price, 0);

  // รวมยอดขายตาม "การ์ดรุ่นเดียวกัน" (ชื่อ + ชุด + เกรด) ไม่ใช่รายใบ
  const byKey = new Map<string, MarketSale[]>();
  for (const s of sales) {
    const list = byKey.get(s.key);
    if (list) list.push(s);
    else byKey.set(s.key, [s]);
  }

  const cards: MarketCard[] = [];
  for (const [key, group] of byKey) {
    const ordered = [...group].sort((a, b) => a.soldAt - b.soldAt); // เก่า → ใหม่
    const latest = ordered[ordered.length - 1]!;
    const prices = ordered.map((s) => s.price);
    const points: SalePoint[] = ordered.map((s) => ({
      price: s.price,
      soldAt: s.soldAt,
      isAuction: s.isAuction,
    }));

    const last24 = ordered.filter((s) => now - s.soldAt <= DAY);
    const last30 = ordered.filter((s) => now - s.soldAt <= 30 * DAY);
    const avgOf = (list: MarketSale[]) =>
      list.length ? list.reduce((s, r) => s + r.price, 0) / list.length : 0;

    const perDay = new Map<string, { sum: number; n: number }>();
    for (const s of ordered) {
      const day = new Date(s.soldAt).toISOString().slice(0, 10);
      const bucket = perDay.get(day) ?? { sum: 0, n: 0 };
      bucket.sum += s.price;
      bucket.n += 1;
      perDay.set(day, bucket);
    }
    const priceHistory: PricePoint[] = [...perDay.entries()].map(([date, b]) => ({
      date,
      price: Math.round(b.sum / b.n),
    }));

    cards.push({
      // ใช้รหัสการ์ดใบล่าสุดเป็นลิงก์ของรุ่นนี้ (ลิงก์เก่าของใบอื่นในรุ่นเดียวกันยังเปิดได้ ดู useMarketCard)
      id: latest.cardId,
      key,
      cardIds: [...new Set(ordered.map((s) => s.cardId))],
      cardName: latest.cardName,
      setName: latest.setName,
      grade: latest.grade,
      imageUrl: [...ordered].reverse().find((s) => s.imageUrl)?.imageUrl ?? "",
      lastPrice: latest.price,
      change24h: Number((changeInWindow(points, 1, now) ?? 0).toFixed(1)),
      volume24h: last24.length,
      allTimeHigh: Math.max(...prices),
      allTimeLow: Math.min(...prices),
      avg30d: Math.round(avgOf(last30.length ? last30 : ordered)),
      totalSold: ordered.length,
      priceHistory,
      transactions: [...ordered].reverse().map((s, i) => ({
        id: `${s.cardId}-${i}`,
        date: new Date(s.soldAt).toISOString().slice(0, 10),
        type: s.isAuction ? ("auction" as const) : ("buyout" as const),
        price: s.price,
        status: "completed" as const,
      })),
      marketPrice: marketPriceOf(points, now),
      lastSoldAt: latest.soldAt,
      sales: points,
    });
  }

  cards.sort((a, b) => b.volume24h - a.volume24h || (b.lastSoldAt ?? 0) - (a.lastSoldAt ?? 0));

  return {
    summary: {
      totalVolume,
      totalTransactions: sales.length,
      volumeChange24h: volPrev24 ? Number((((vol24 - volPrev24) / volPrev24) * 100).toFixed(1)) : 0,
    },
    cards,
    sales,
    keyWithCompany,
  };
}

async function fetchMarketStats(): Promise<MarketStats> {
  const { data, error } = await supabase.rpc("market_sales");
  if (error) throw error;
  return buildStats((data ?? []) as unknown as SaleRow[]);
}

export function useMarketStats() {
  const query = useQuery({
    queryKey: ["market-stats"],
    queryFn: fetchMarketStats,
    staleTime: 60_000,
  });

  return {
    summary: query.data?.summary ?? EMPTY_SUMMARY,
    cards: query.data?.cards ?? EMPTY_CARDS,
    sales: query.data?.sales ?? EMPTY_SALES,
    keyWithCompany: query.data?.keyWithCompany ?? false,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/** หาการ์ดรุ่นเดียวกันจากรหัสการ์ดใบใดก็ได้ในรุ่นนั้น */
export function useMarketCard(id: string) {
  const { cards, sales, keyWithCompany, isLoading, error } = useMarketStats();
  const card = cards.find((c) => c.id === id) ?? cards.find((c) => c.cardIds?.includes(id));
  return { card, sales, keyWithCompany, isLoading, error };
}

/**
 * ดัชนีราคาตลาดตามคีย์การ์ด — ใช้บนการ์ดสินค้าเพื่อเทียบราคาที่ตั้งขายกับราคาตลาด
 */
export function useMarketPriceIndex() {
  const { cards, keyWithCompany } = useMarketStats();
  const byKey = new Map<string, MarketCard>();
  for (const c of cards) if (c.key) byKey.set(c.key, c);
  const lookup = (input: {
    name: string;
    set?: string | null;
    grade?: string | null;
    company?: string | null;
    condition?: string | null;
  }) => byKey.get(cardKey(input, keyWithCompany));
  return { lookup };
}

/** Keep only the points that fall inside the selected range. */
export function historyInRange(history: PricePoint[], range: MarketRange): PricePoint[] {
  const cutoff = Date.now() - rangeDays[range] * DAY;
  const inRange = history.filter((p) => new Date(p.date).getTime() >= cutoff);
  return inRange.length > 1 ? inRange : history;
}
