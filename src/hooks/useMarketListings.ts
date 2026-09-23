import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useMarketStats } from "@/hooks/useMarketStats";
import { cardKey } from "@/lib/market-price";
import { isPermissionError } from "@/lib/query-guards";

/** การ์ดที่เปิดขาย/ประมูลอยู่ตอนนี้ (สำหรับ "มีขายอยู่ X ใบ" ในหน้าสถิติ) */
export interface ActiveListing {
  cardId: string;
  name: string;
  image: string | null;
  kind: "fixed" | "auction";
  price: number;
  endTime: string | null;
  href: string;
}

interface Row {
  id: string;
  name: string;
  set_name: string | null;
  grade: string | null;
  grading_company: string | null;
  condition: string | null;
  price: number;
  images: string[] | null;
  sale_type: "fixed_price" | "auction";
  stock_quantity: number | null;
  auctions: { id: string; current_price: number; end_time: string; status: string }[] | null;
}

export function useActiveListings() {
  const { keyWithCompany } = useMarketStats();
  const query = useQuery({
    queryKey: ["market-listings"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select(
          "id, name, set_name, grade, grading_company, condition, price, images, sale_type, stock_quantity, auctions (id, current_price, end_time, status)",
        )
        .eq("is_published", true)
        .eq("status", "available")
        .limit(500);
      if (error) {
        if (isPermissionError(error)) return [] as Row[];
        throw error;
      }
      return (data ?? []) as unknown as Row[];
    },
  });

  const byKey = useMemo(() => {
    const map = new Map<string, ActiveListing[]>();
    const now = Date.now();
    for (const r of query.data ?? []) {
      let item: ActiveListing | null = null;
      if (r.sale_type === "fixed_price") {
        if ((r.stock_quantity ?? 1) <= 0) continue;
        item = {
          cardId: r.id,
          name: r.name,
          image: r.images?.[0] ?? null,
          kind: "fixed",
          price: Number(r.price),
          endTime: null,
          href: `/product/${r.id}`,
        };
      } else {
        const a = (r.auctions ?? []).find(
          (x) => x.status === "active" && new Date(x.end_time).getTime() > now,
        );
        if (!a) continue;
        item = {
          cardId: r.id,
          name: r.name,
          image: r.images?.[0] ?? null,
          kind: "auction",
          price: Number(a.current_price),
          endTime: a.end_time,
          href: `/card/${r.id}`,
        };
      }
      const key = cardKey(
        { name: r.name, set: r.set_name, grade: r.grade, company: r.grading_company, condition: r.condition },
        keyWithCompany,
      );
      const list = map.get(key);
      if (list) list.push(item);
      else map.set(key, [item]);
    }
    for (const list of map.values()) {
      // ขายราคาปกติ (ถูกสุดก่อน) แล้วตามด้วยประมูล
      list.sort((a, b) => (a.kind === b.kind ? a.price - b.price : a.kind === "fixed" ? -1 : 1));
    }
    return map;
  }, [query.data, keyWithCompany]);

  return { byKey, isLoading: query.isLoading };
}
