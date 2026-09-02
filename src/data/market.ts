import card1 from "@/assets/card-1.jpg";
import card2 from "@/assets/card-2.jpg";
import card3 from "@/assets/card-3.jpg";
import card4 from "@/assets/card-4.jpg";
import card5 from "@/assets/card-5.jpg";
import card6 from "@/assets/card-6.jpg";

export interface PricePoint {
  date: string; // YYYY-MM-DD
  price: number;
}

export interface MarketTransaction {
  id: string;
  date: string;
  type: "auction" | "buyout";
  price: number;
  status: "completed";
}

export interface MarketCard {
  id: string;
  cardName: string;
  setName: string;
  grade: string;
  imageUrl: string;
  lastPrice: number;
  /** % change over 24h */
  change24h: number;
  volume24h: number;
  allTimeHigh: number;
  allTimeLow: number;
  avg30d: number;
  totalSold: number;
  priceHistory: PricePoint[];
  transactions: MarketTransaction[];
}

function genHistory(endPrice: number, trend: number, days = 365): PricePoint[] {
  const points: PricePoint[] = [];
  const now = new Date();
  let price = endPrice / (1 + trend);
  for (let i = days; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    points.push({
      date: d.toISOString().slice(0, 10),
      price: Math.round(price),
    });
    // deterministic pseudo-random walk toward trend
    const noise = Math.sin(i * 12.9898) * 0.02;
    price *= 1 + trend / days + noise;
  }
  points[points.length - 1]!.price = endPrice;
  return points;
}

function genTransactions(avg: number, count: number): MarketTransaction[] {
  const txs: MarketTransaction[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 4 - 1);
    txs.push({
      id: `tx-${i + 1}`,
      date: d.toISOString().slice(0, 10),
      type: i % 3 === 0 ? "buyout" : "auction",
      price: Math.round(avg * (1 + Math.sin(i * 7.7) * 0.08)),
      status: "completed",
    });
  }
  return txs;
}

export const marketCards: MarketCard[] = [
  {
    id: "prd-2001",
    cardName: "Emberfox Holo #04",
    setName: "Base Set 1999",
    grade: "PSA 10",
    imageUrl: card1,
    lastPrice: 8990,
    change24h: 2.8,
    volume24h: 3,
    allTimeHigh: 12500,
    allTimeLow: 4200,
    avg30d: 8720,
    totalSold: 12,
    priceHistory: genHistory(8990, 0.6),
    transactions: genTransactions(8800, 12),
  },
  {
    id: "prd-2002",
    cardName: "Voltbrand Prime",
    setName: "Neo Genesis",
    grade: "PSA 9",
    imageUrl: card2,
    lastPrice: 2450,
    change24h: 5.4,
    volume24h: 11,
    allTimeHigh: 3100,
    allTimeLow: 980,
    avg30d: 2390,
    totalSold: 34,
    priceHistory: genHistory(2450, 0.45),
    transactions: genTransactions(2400, 18),
  },
  {
    id: "prd-2004",
    cardName: "Aurum Rainbow Rare",
    setName: "Golden Vault",
    grade: "BGS 9.5",
    imageUrl: card4,
    lastPrice: 3620,
    change24h: 1.9,
    volume24h: 6,
    allTimeHigh: 4400,
    allTimeLow: 2100,
    avg30d: 3540,
    totalSold: 21,
    priceHistory: genHistory(3620, 0.35),
    transactions: genTransactions(3500, 14),
  },
  {
    id: "prd-2005",
    cardName: "Nebula Sovereign",
    setName: "Cosmic Eclipse",
    grade: "PSA 9",
    imageUrl: card5,
    lastPrice: 1780,
    change24h: -1.2,
    volume24h: 4,
    allTimeHigh: 2300,
    allTimeLow: 890,
    avg30d: 1810,
    totalSold: 40,
    priceHistory: genHistory(1780, 0.28),
    transactions: genTransactions(1800, 15),
  },
  {
    id: "prd-2003",
    cardName: "Verdant Bloom",
    setName: "Jungle Reprint",
    grade: "Raw",
    imageUrl: card3,
    lastPrice: 310,
    change24h: -3.1,
    volume24h: 22,
    allTimeHigh: 480,
    allTimeLow: 120,
    avg30d: 322,
    totalSold: 88,
    priceHistory: genHistory(310, 0.15),
    transactions: genTransactions(315, 20),
  },
  {
    id: "prd-2006",
    cardName: "Silver Tide Etch",
    setName: "Tidal Forge",
    grade: "Raw",
    imageUrl: card6,
    lastPrice: 940,
    change24h: 0.8,
    volume24h: 5,
    allTimeHigh: 1250,
    allTimeLow: 460,
    avg30d: 925,
    totalSold: 15,
    priceHistory: genHistory(940, 0.22),
    transactions: [],
  },
];

export const marketSummary = {
  totalVolume: 428_540_000,
  totalTransactions: 1_284_390,
  volumeChange24h: 12.4,
};

export const getMarketCardById = (id: string): MarketCard | undefined =>
  marketCards.find((card) => card.id === id);

export type MarketRange = "7d" | "1m" | "1y";

export const rangeDays: Record<MarketRange, number> = { "7d": 7, "1m": 30, "1y": 365 };

export function sliceHistory(history: PricePoint[], range: MarketRange): PricePoint[] {
  return history.slice(-(rangeDays[range] + 1));
}

export function formatThb(value: number): string {
  return `฿${value.toLocaleString("th-TH")}`;
}
