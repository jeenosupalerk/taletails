import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { MarketCard, MarketRange, PricePoint } from "@/data/market";
import { rangeDays } from "@/data/market";

interface SaleRow {
  card_id: string;
  card_name: string;
  set_name: string | null;
  grade: string | null;
  image: string | null;
  is_auction: boolean;
  price: number;
  sold_at: string;
}

export interface MarketSummary {
  totalVolume: number;
  totalTransactions: number;
  volumeChange24h: number;
}

export interface MarketStats {
  summary: MarketSummary;
  cards: MarketCard[];
}

const DAY = 24 * 60 * 60 * 1000;

function buildStats(rows: SaleRow[]): MarketStats {
  const now = Date.now();
  const totalVolume = rows.reduce((sum, r) => sum + Number(r.price), 0);
  const vol24 = rows
    .filter((r) => now - new Date(r.sold_at).getTime() <= DAY)
    .reduce((sum, r) => sum + Number(r.price), 0);
  const volPrev24 = rows
    .filter((r) => {
      const age = now - new Date(r.sold_at).getTime();
      return age > DAY && age <= 2 * DAY;
    })
    .reduce((sum, r) => sum + Number(r.price), 0);

  const byCard = new Map<string, SaleRow[]>();
  for (const row of rows) {
    const list = byCard.get(row.card_id);
    if (list) list.push(row);
    else byCard.set(row.card_id, [row]);
  }

  const cards: MarketCard[] = [];
  for (const [cardId, sales] of byCard) {
    // oldest → newest
    const ordered = [...sales].sort(
      (a, b) => new Date(a.sold_at).getTime() - new Date(b.sold_at).getTime(),
    );
    const first = ordered[0]!;
    const latest = ordered[ordered.length - 1]!;
    const prices = ordered.map((s) => Number(s.price));

    const last24 = ordered.filter((s) => now - new Date(s.sold_at).getTime() <= DAY);
    const prev24 = ordered.filter((s) => {
      const age = now - new Date(s.sold_at).getTime();
      return age > DAY && age <= 2 * DAY;
    });
    const avgOf = (list: SaleRow[]) =>
      list.length ? list.reduce((s, r) => s + Number(r.price), 0) / list.length : 0;
    const avg24 = avgOf(last24);
    const avgPrev = avgOf(prev24);
    const change24h = avg24 && avgPrev ? ((avg24 - avgPrev) / avgPrev) * 100 : 0;

    const last30 = ordered.filter((s) => now - new Date(s.sold_at).getTime() <= 30 * DAY);
    const avg30d = Math.round(avgOf(last30.length ? last30 : ordered));

    // one point per day (average of that day's sales)
    const perDay = new Map<string, { sum: number; n: number }>();
    for (const s of ordered) {
      const day = new Date(s.sold_at).toISOString().slice(0, 10);
      const bucket = perDay.get(day) ?? { sum: 0, n: 0 };
      bucket.sum += Number(s.price);
      bucket.n += 1;
      perDay.set(day, bucket);
    }
    const priceHistory: PricePoint[] = [...perDay.entries()].map(([date, b]) => ({
      date,
      price: Math.round(b.sum / b.n),
    }));

    cards.push({
      id: cardId,
      cardName: first.card_name,
      setName: first.set_name || "ไม่ระบุชุด",
      grade: first.grade || "Raw",
      imageUrl: latest.image || "",
      lastPrice: Number(latest.price),
      change24h: Number(change24h.toFixed(1)),
      volume24h: last24.length,
      allTimeHigh: Math.max(...prices),
      allTimeLow: Math.min(...prices),
      avg30d,
      totalSold: ordered.length,
      priceHistory,
      transactions: [...ordered].reverse().map((s, i) => ({
        id: `${cardId}-${i}`,
        date: new Date(s.sold_at).toISOString().slice(0, 10),
        type: s.is_auction ? ("auction" as const) : ("buyout" as const),
        price: Number(s.price),
        status: "completed" as const,
      })),
    });
  }

  cards.sort((a, b) => b.volume24h - a.volume24h || b.totalSold - a.totalSold);

  return {
    summary: {
      totalVolume,
      totalTransactions: rows.length,
      volumeChange24h: volPrev24 ? Number((((vol24 - volPrev24) / volPrev24) * 100).toFixed(1)) : 0,
    },
    cards,
  };
}

async function fetchMarketStats(): Promise<MarketStats> {
  const { data, error } = await supabase.rpc("market_sales");
  if (error) throw error;
  return buildStats((data ?? []) as SaleRow[]);
}

export function useMarketStats() {
  const query = useQuery({
    queryKey: ["market-stats"],
    queryFn: fetchMarketStats,
    staleTime: 60_000,
  });

  return {
    summary: query.data?.summary ?? { totalVolume: 0, totalTransactions: 0, volumeChange24h: 0 },
    cards: query.data?.cards ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

export function useMarketCard(id: string) {
  const { cards, isLoading, error } = useMarketStats();
  return { card: cards.find((c) => c.id === id), isLoading, error };
}

/** Keep only the points that fall inside the selected range. */
export function historyInRange(history: PricePoint[], range: MarketRange): PricePoint[] {
  const cutoff = Date.now() - rangeDays[range] * DAY;
  const inRange = history.filter((p) => new Date(p.date).getTime() >= cutoff);
  return inRange.length > 1 ? inRange : history;
}
