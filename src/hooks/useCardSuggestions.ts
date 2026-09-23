import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { supabase } from "@/integrations/supabase/client";
import { looseKey, normText } from "@/lib/market-price";
import { isPermissionError } from "@/lib/query-guards";

/** การ์ดที่เคยลงไว้แล้ว 1 แบบ (ชื่อ + ชุด + เลขการ์ด) ใช้เป็นคำแนะนำตอนลงสินค้า */
export interface CardSuggestion {
  name: string;
  setName: string;
  cardNo: string;
  rarity: string;
  language: string;
  year: string;
  /** จำนวนใบที่เคยลงด้วยชื่อ+ชุดนี้ */
  count: number;
}

export interface SetSuggestion {
  setName: string;
  count: number;
}

interface Row {
  name: string;
  set_name: string | null;
  card_no: string | null;
  rarity: string | null;
  language: string | null;
  year: number | null;
}

const s = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v).trim());

/**
 * รวมชื่อการ์ด/ชื่อชุดที่เคยลงไว้แล้ว เพื่อให้พิมพ์ตรงกันทุกครั้ง
 * (ราคากลางจะรวมเป็น "การ์ดรุ่นเดียวกัน" ได้ก็ต่อเมื่อชื่อและชุดตรงกัน)
 */
export function useCardSuggestions(enabled = true) {
  const query = useQuery({
    queryKey: ["card-suggestions"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cards")
        .select("name, set_name, card_no, rarity, language, year")
        .order("updated_at", { ascending: false })
        .limit(2000);
      if (error) {
        if (isPermissionError(error)) return [] as Row[];
        throw error;
      }
      return (data ?? []) as Row[];
    },
  });

  return useMemo(() => {
    const cards = new Map<string, CardSuggestion>();
    const sets = new Map<string, SetSuggestion>();
    for (const r of query.data ?? []) {
      const name = s(r.name);
      if (!name) continue;
      const setName = s(r.set_name);
      const key = `${normText(name)}|${normText(setName)}|${normText(r.card_no)}`;
      const hit = cards.get(key);
      if (hit) hit.count += 1;
      else
        cards.set(key, {
          name,
          setName,
          cardNo: s(r.card_no),
          rarity: s(r.rarity),
          language: s(r.language),
          year: s(r.year),
          count: 1,
        });
      if (setName) {
        const sk = normText(setName);
        const sh = sets.get(sk);
        if (sh) sh.count += 1;
        else sets.set(sk, { setName, count: 1 });
      }
    }
    const cardList = [...cards.values()];
    const setList = [...sets.values()];
    return {
      cards: cardList,
      sets: setList,
      /** หาชื่อที่ "เกือบเหมือน" (ต่างกันแค่ตัวพิมพ์/เว้นวรรค/ขีด) แต่สะกดไม่ตรงเป๊ะ */
      similarName: (typed: string) => {
        const t = s(typed);
        if (!t) return null;
        if (cardList.some((c) => c.name === t)) return null;
        const lk = looseKey(t);
        return cardList.find((c) => looseKey(c.name) === lk)?.name ?? null;
      },
      similarSet: (typed: string) => {
        const t = s(typed);
        if (!t) return null;
        if (setList.some((c) => c.setName === t)) return null;
        const lk = looseKey(t);
        return setList.find((c) => looseKey(c.setName) === lk)?.setName ?? null;
      },
    };
  }, [query.data]);
}
