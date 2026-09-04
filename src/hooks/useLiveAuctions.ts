import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { isPermissionError } from "@/lib/query-guards";
import type { Auction } from "@/data/auctions";

export interface LiveAuction extends Auction {
  /** รหัสรอบประมูลจริงในฐานข้อมูล (ใช้สำหรับเคาะราคา) */
  auctionId: string;
  cardId: string;
  bidIncrement: number;
}

interface AuctionJoinRow {
  id: string;
  card_id: string;
  starting_price: number;
  current_price: number;
  bid_increment: number;
  bid_count: number;
  end_time: string;
  status: string;
  cards: {
    id: string;
    name: string;
    set_name: string | null;
    images: string[] | null;
    grade: string | null;
    card_no: string | null;
    language: string | null;
    rarity: string | null;
    year: number | null;
    grading_company: string | null;
    certification_no: string | null;
    condition: string | null;
    details: string | null;
  } | null;
}

const SELECT =
  "id, card_id, starting_price, current_price, bid_increment, bid_count, end_time, status, cards:card_id (id, name, set_name, images, grade, card_no, language, rarity, year, grading_company, certification_no, condition, details)";

function toLiveAuction(row: AuctionJoinRow): LiveAuction | null {
  const card = row.cards;
  if (!card) return null;
  const images = card.images?.length ? card.images : ["/taletails-logo.jpg"];
  const endsIn = new Date(row.end_time).getTime() - Date.now();

  return {
    auctionId: row.id,
    cardId: card.id,
    bidIncrement: Number(row.bid_increment ?? 50),
    id: row.id,
    cardName: card.name,
    setName: card.set_name ?? "-",
    grade: card.grade ?? "-",
    imageUrl: images[0]!,
    images,
    startingPrice: Number(row.starting_price ?? 0),
    currentBid: Number(row.current_price ?? row.starting_price ?? 0),
    bidCount: Number(row.bid_count ?? 0),
    endTime: row.end_time,
    status: endsIn <= 0 ? "ended" : endsIn < 3 * 60 * 60 * 1000 ? "ending-soon" : "live",
    cardNo: card.card_no ?? "-",
    language: card.language ?? "-",
    rarity: card.rarity ?? "-",
    year: card.year ?? new Date().getFullYear(),
    gradingCompany: card.grading_company ?? "-",
    certificationNo: card.certification_no ?? "-",
    conditionNote: card.condition ?? "-",
    sellerNote: card.details ?? "",
  };
}

/**
 * รอบประมูลที่ยังเปิดอยู่จาก Supabase (ตาราง auctions + cards)
 * — RLS อนุญาตให้อ่านได้เมื่อผู้ใช้เข้าสู่ระบบแล้ว
 */
export function useLiveAuctions() {
  return useQuery({
    queryKey: ["auctions", "live"],
    staleTime: 4_000,
    refetchInterval: 5_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(SELECT)
        .eq("status", "active")
        .gt("end_time", new Date().toISOString())
        .order("end_time", { ascending: true })
        .limit(24);
      if (error) {
        if (isPermissionError(error)) return [] as LiveAuction[];
        throw error;
      }
      return ((data ?? []) as unknown as AuctionJoinRow[])
        .map(toLiveAuction)
        .filter((a): a is LiveAuction => a !== null);
    },
    retry: false,
  });
}
