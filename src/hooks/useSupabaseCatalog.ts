import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/data/products";

/**
 * Live data from the connected Supabase project.
 * Tables: users, cards, auctions, bids.
 */

export interface CardRow {
  id: string;
  seller_id: string | null;
  name: string;
  details: string | null;
  images: string[];
  set_name: string | null;
  card_no: string | null;
  language: string | null;
  rarity: string | null;
  year: number | null;
  condition: string | null;
  grade: string | null;
  grading_company: string | null;
  certification_no: string | null;
  sale_type: "auction" | "fixed_price";
  price: number;
  status: "available" | "locked" | "sold";
}

export function cardRowToProduct(row: CardRow, sellerName = "Taletails Store"): Product {
  const images = row.images?.length ? row.images : ["/taletails-logo.jpg"];
  return {
    id: row.id,
    cardName: row.name,
    setName: row.set_name ?? "-",
    conditionTag: row.condition ?? row.grade ?? "-",
    price: Number(row.price ?? 0),
    imageUrl: images[0]!,
    images,
    cardIdCode: row.certification_no ?? row.card_no ?? row.id.slice(0, 8).toUpperCase(),
    isVerified: Boolean(row.certification_no),
    storeName: sellerName,
    cardNo: row.card_no ?? "-",
    language: row.language ?? "-",
    rarity: row.rarity ?? "-",
    year: row.year ?? new Date().getFullYear(),
    grade: row.grade ?? "-",
    gradingCompany: row.grading_company ?? "-",
    certificationNo: row.certification_no ?? "-",
    conditionNote: row.condition ?? "-",
    sellerNote: row.details ?? "",
    lastSalePrice: Number(row.price ?? 0),
    highestBid: null,
    soldCount: 0,
    rating: 5,
    reviews: [],
  };
}

/** Fixed-price cards available in the marketplace. */
export function useMarketplaceCards() {
  return useQuery({
    queryKey: ["cards", "marketplace"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(
          "id, seller_id, name, details, images, set_name, card_no, language, rarity, year, condition, grade, grading_company, certification_no, sale_type, price, status, users:seller_id (username)",
        )
        .eq("status", "available")
        .eq("sale_type", "fixed_price")
        .order("created_at", { ascending: false })
        .limit(24);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { users, ...card } = row as unknown as CardRow & {
          users: { username: string | null } | null;
        };
        return cardRowToProduct(card, users?.username ?? "Taletails Store");
      });
    },
    staleTime: 30_000,
  });
}

/** Active auctions with their card. */
export function useLiveAuctions() {
  return useQuery({
    queryKey: ["auctions", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auctions")
        .select(
          "id, card_id, starting_price, current_price, bid_increment, bid_count, start_time, end_time, status, cards:card_id (id, name, set_name, grade, images)",
        )
        .eq("status", "active")
        .order("end_time", { ascending: true })
        .limit(12);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 4_000,
    refetchInterval: 4_000,
  });
}

/** Bid history for one auction. */
export function useAuctionBids(auctionId?: string) {
  return useQuery({
    queryKey: ["bids", auctionId],
    enabled: Boolean(auctionId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bids")
        .select("id, auction_id, user_id, amount, created_at, users:user_id (username, avatar_url)")
        .eq("auction_id", auctionId!)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5_000,
  });
}
