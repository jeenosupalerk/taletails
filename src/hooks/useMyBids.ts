import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { isPermissionError } from "@/lib/query-guards";

/** สถานะของผู้ประมูลคนนี้ในแต่ละรอบ */
export type MyBidState = "leading" | "outbid" | "won" | "lost" | "finalizing";

interface RawBid {
  auction_id: string;
  amount: number;
  created_at: string;
  auctions: {
    id: string;
    card_id: string;
    status: string;
    current_price: number;
    bid_increment: number;
    end_time: string;
    winner_id: string | null;
    cards: {
      id: string;
      name: string;
      set_name: string | null;
      grade: string | null;
      grading_company: string | null;
      images: string[] | null;
    } | null;
  } | null;
}

/** หนึ่งรอบประมูลที่ผู้ใช้เคยเสนอราคา (รวมทุกครั้งที่เสนอในรอบนั้นแล้ว) */
export interface MyBidRow {
  auctionId: string;
  cardId: string;
  name: string;
  setName: string | null;
  grade: string | null;
  gradingCompany: string | null;
  image: string | null;
  /** ราคาสูงสุดที่ผู้ใช้เสนอไว้ในรอบนี้ */
  myBest: number;
  myBidCount: number;
  currentPrice: number;
  bidIncrement: number;
  endTime: string;
  auctionStatus: string;
  winnerId: string | null;
  /** เวลาที่เสนอครั้งล่าสุด */
  lastBidAt: string;
}

/** รอบยังเปิดรับเสนอราคาอยู่หรือไม่ (สถานะ active และยังไม่ถึงเวลาปิด) */
export function isBidLive(row: Pick<MyBidRow, "auctionStatus" | "endTime">, now = Date.now()) {
  return row.auctionStatus === "active" && new Date(row.endTime).getTime() > now;
}

/**
 * สถานะของผู้ใช้ในรอบนั้น
 * - ยังเปิด: ราคาที่เราเสนอสูงสุด >= ราคาปัจจุบัน = นำอยู่ ไม่งั้นถูกแซง
 * - ปิดแล้ว: ดูจากผู้ชนะที่ระบบบันทึก (ถ้ายังไม่บันทึก = กำลังสรุปผล)
 */
export function myBidState(row: MyBidRow, userId: string | null, now = Date.now()): MyBidState {
  if (isBidLive(row, now)) return row.myBest >= row.currentPrice ? "leading" : "outbid";
  if (row.winnerId) return row.winnerId === userId ? "won" : "lost";
  if (row.auctionStatus === "active") return "finalizing";
  return "lost";
}

/**
 * รอบประมูลทั้งหมดที่ผู้ใช้ที่ล็อกอินอยู่เคยเสนอราคา (ใหม่สุดก่อน)
 * ผู้ใช้ที่ล็อกอินอ่าน bids/auctions/cards ได้ทั้งหมดตาม RLS อยู่แล้ว จึงไม่ต้องมี SQL เพิ่ม
 */
export function useMyBids() {
  const userId = useAuthUserId();

  return useQuery({
    queryKey: ["my-bids", userId],
    enabled: Boolean(userId),
    queryFn: async (): Promise<MyBidRow[]> => {
      const { data, error } = await supabase
        .from("bids")
        .select(
          "auction_id, amount, created_at, auctions:auction_id (id, card_id, status, current_price, bid_increment, end_time, winner_id, cards:card_id (id, name, set_name, grade, grading_company, images))",
        )
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) {
        if (isPermissionError(error)) return [];
        throw error;
      }

      // ประวัติเรียงใหม่สุดก่อน → แถวแรกของแต่ละรอบคือครั้งล่าสุด
      const byAuction = new Map<string, MyBidRow>();
      for (const b of (data ?? []) as unknown as RawBid[]) {
        const a = b.auctions;
        if (!a) continue;
        const amount = Number(b.amount);
        const existing = byAuction.get(a.id);
        if (existing) {
          existing.myBest = Math.max(existing.myBest, amount);
          existing.myBidCount += 1;
          continue;
        }
        byAuction.set(a.id, {
          auctionId: a.id,
          cardId: a.card_id,
          name: a.cards?.name ?? "การ์ด",
          setName: a.cards?.set_name ?? null,
          grade: a.cards?.grade ?? null,
          gradingCompany: a.cards?.grading_company ?? null,
          image: a.cards?.images?.[0] ?? null,
          myBest: amount,
          myBidCount: 1,
          currentPrice: Number(a.current_price),
          bidIncrement: Number(a.bid_increment),
          endTime: a.end_time,
          auctionStatus: a.status,
          winnerId: a.winner_id,
          lastBidAt: b.created_at,
        });
      }
      return [...byAuction.values()];
    },
    retry: 1,
    staleTime: 5_000,
    refetchInterval: 10_000,
  });
}
