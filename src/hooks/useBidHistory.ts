import { useEffect, useState } from "react";

export interface BidEntry {
  id: string;
  bidder: string;
  amount: number;
  at: number;
}

const NAMES = ["ณัฐ***", "ฟ็อกซ์***", "พลอย***", "กิต***", "มิ้น***", "ต้น***", "แบงค์***"];

const rnd = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)]!;

function seed(currentBid: number, bidCount: number): BidEntry[] {
  const rows: BidEntry[] = [];
  const n = Math.min(6, Math.max(1, bidCount));
  for (let i = 0; i < n; i++) {
    rows.push({
      id: `seed-${i}`,
      bidder: NAMES[i % NAMES.length]!,
      amount: currentBid - i * 50,
      at: Date.now() - (i + 1) * 47_000,
    });
  }
  return rows;
}

/** Simulated realtime bid feed for an auction. */
export function useBidHistory(auctionId: string, currentBid: number, bidCount: number) {
  const [entries, setEntries] = useState<BidEntry[]>([]);

  useEffect(() => {
    setEntries(seed(currentBid, bidCount));
    let top = currentBid;
    const id = window.setInterval(() => {
      if (Math.random() > 0.55) return;
      top += 50 * (1 + Math.floor(Math.random() * 4));
      setEntries((prev) =>
        [
          { id: `${Date.now()}`, bidder: rnd(NAMES), amount: top, at: Date.now() },
          ...prev,
        ].slice(0, 20),
      );
    }, 5000);
    return () => window.clearInterval(id);
  }, [auctionId, currentBid, bidCount]);

  const pushOwnBid = (amount: number) =>
    setEntries((prev) =>
      [{ id: `me-${Date.now()}`, bidder: "คุณ", amount, at: Date.now() }, ...prev].slice(0, 20),
    );

  return { entries, pushOwnBid };
}

export function timeAgo(at: number) {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 60) return `${s} วินาทีที่แล้ว`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} นาทีที่แล้ว`;
  return `${Math.floor(m / 60)} ชม.ที่แล้ว`;
}
