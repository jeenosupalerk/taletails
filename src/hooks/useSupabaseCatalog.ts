import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { isPermissionError } from "@/lib/query-guards";
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
    status: row.status,
  };
}

const CARD_COLUMNS =
  "id, seller_id, name, details, images, set_name, card_no, language, rarity, year, condition, grade, grading_company, certification_no, sale_type, price, status, users:seller_id (username)";

/**
 * Real "sold" totals: how many cards with the same name have already been sold.
 * Keyed by lower-cased card name.
 */
async function fetchSoldCounts(): Promise<Record<string, number>> {
  const { data, error } = await supabase.from("cards").select("name").eq("status", "sold");
  if (error) {
    if (isPermissionError(error)) return {};
    throw error;
  }
  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    const key = (row as { name: string }).name.trim().toLowerCase();
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}

export function useSoldCounts() {
  return useQuery({ queryKey: ["cards", "sold-counts"], queryFn: fetchSoldCounts, staleTime: 60_000 });
}

/** Fixed-price cards available in the marketplace. */
export function useMarketplaceCards() {
  return useQuery({
    queryKey: ["cards", "marketplace"],
    queryFn: async () => {
      const [{ data, error }, soldCounts] = await Promise.all([
        supabase
          .from("cards")
          .select(CARD_COLUMNS)
          .in("status", ["available", "locked", "sold"])
          .eq("sale_type", "fixed_price")
          .order("created_at", { ascending: false })
          .limit(24),
        fetchSoldCounts(),
      ]);
      if (error) {
        if (isPermissionError(error)) return [] as Product[];
        throw error;
      }
      return (data ?? []).map((row) => {
        const { users, ...card } = row as unknown as CardRow & {
          users: { username: string | null } | null;
        };
        const product = cardRowToProduct(card, users?.username ?? "Taletails Store");
        product.soldCount = soldCounts[card.name.trim().toLowerCase()] ?? 0;
        return product;
      });
    },
    staleTime: 30_000,
  });
}

/** One live card mapped to the marketplace product shape (detail page). */
export function useLiveProduct(id: string, enabled = true) {
  return useQuery({
    queryKey: ["cards", "product", id],
    enabled: enabled && Boolean(id),
    queryFn: async () => {
      const [{ data, error }, soldCounts] = await Promise.all([
        supabase.from("cards").select(CARD_COLUMNS).eq("id", id).maybeSingle(),
        fetchSoldCounts(),
      ]);
      if (error) {
        if (isPermissionError(error)) return null;
        throw error;
      }
      if (!data) return null;
      const { users, ...card } = data as unknown as CardRow & {
        users: { username: string | null } | null;
      };
      const product = cardRowToProduct(card, users?.username ?? "Taletails Store");
      product.soldCount = soldCounts[card.name.trim().toLowerCase()] ?? 0;
      return { product, status: card.status, saleType: card.sale_type };
    },
    staleTime: 15_000,
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
      if (error) {
        if (isPermissionError(error)) return [];
        throw error;
      }
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
