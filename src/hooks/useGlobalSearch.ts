import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useMarketStats } from "@/hooks/useMarketStats";
import { isSoldExpiredFromMarket } from "@/hooks/useSupabaseCatalog";
import { isPermissionError } from "@/lib/query-guards";

/** กลุ่มผลการค้นหา = เมนูของเว็บที่ผลลัพธ์นั้นอยู่ */
export type SearchGroup = "market" | "auction" | "stats" | "news" | "menu";

export type SearchRight =
  | { kind: "price"; price: number; note?: string | undefined }
  | { kind: "live"; endTime: string }
  | { kind: "ended"; label: string }
  | { kind: "change"; pct: number };

export interface SearchResult {
  id: string;
  group: SearchGroup;
  title: string;
  subtitle?: string | undefined;
  image?: string | null | undefined;
  /** ชื่อไอคอนสำหรับรายการที่ไม่มีรูป (เมนู/ข่าว) */
  icon?: string | undefined;
  href: string;
  right?: SearchRight | undefined;
  /** ข้อความเพิ่มเติมที่ใช้จับคู่ แต่ไม่แสดง */
  keywords?: string | undefined;
}

export const GROUP_ORDER: SearchGroup[] = ["market", "auction", "stats", "news", "menu"];

export const GROUP_LABEL: Record<SearchGroup, string> = {
  market: "ตลาดซื้อขาย",
  auction: "ประมูล",
  stats: "สถิติ/ตลาด",
  news: "ข่าวสาร",
  menu: "เมนู",
};

/** แยกคำค้นเป็นคำย่อย (ตัวพิมพ์เล็ก) */
export function tokenize(q: string): string[] {
  return q
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** ทุกคำย่อยต้องพบในข้อความรวม */
function matchesAll(haystack: string, tokens: string[]) {
  const h = haystack.toLowerCase();
  return tokens.every((t) => h.includes(t));
}

/** ตัดอักขระที่ทำให้ตัวกรอง or() ของ PostgREST พัง */
function sanitize(term: string) {
  return term.replace(/[%*,()\\"'`]/g, "").trim();
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(t);
  }, [value, ms]);
  return v;
}

interface CardSearchRow {
  id: string;
  name: string;
  set_name: string | null;
  card_no: string | null;
  certification_no: string | null;
  grade: string | null;
  grading_company: string | null;
  language: string | null;
  rarity: string | null;
  price: number;
  images: string[] | null;
  sale_type: "fixed_price" | "auction";
  status: string;
  stock_quantity: number | null;
  updated_at: string;
  auctions:
    | {
        id: string;
        current_price: number;
        bid_count: number;
        end_time: string;
        status: string;
      }[]
    | null;
}

interface ArticleSearchRow {
  id: string;
  title: string;
  excerpt: string | null;
  category_tag: string;
  published_at: string;
}

const DAY = 86_400_000;
const thDate = new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" });

function gradeText(company: string | null, grade: string | null) {
  if (!grade) return company ?? "";
  if (company && !grade.toUpperCase().startsWith(company.toUpperCase())) return `${company} ${grade}`;
  return grade;
}

export const MENU_ITEMS: (SearchResult & { adminOnly?: boolean; guestOnly?: boolean })[] = [
  { id: "m-home", group: "menu", title: "หน้าแรก", subtitle: "กลับสู่หน้าหลัก", icon: "home", href: "/", keywords: "home หน้าหลัก" },
  { id: "m-auctions", group: "menu", title: "ประมูล", subtitle: "ดูการ์ดที่กำลังประมูลทั้งหมด", icon: "gavel", href: "/auctions", keywords: "auction บิด เคาะราคา" },
  { id: "m-market", group: "menu", title: "ตลาดซื้อขาย", subtitle: "การ์ดราคาคงที่ พร้อมส่ง", icon: "store", href: "/marketplace", keywords: "marketplace shop ซื้อ ร้าน" },
  { id: "m-stats", group: "menu", title: "สถิติ/ตลาด", subtitle: "ราคาและเทรนด์การ์ด", icon: "chart", href: "/market", keywords: "stats price ราคา กราฟ เทรนด์" },
  { id: "m-stats-sqc", group: "menu", title: "ราคากลางเกรดไทย (SQC)", subtitle: "สถิติราคาการ์ดเกรด SQC", icon: "chart", href: "/market?grade=sqc", keywords: "sqc เกรดไทย ราคากลาง thai grade" },
  { id: "m-vault", group: "menu", title: "ประเมินการ์ดสะสม", subtitle: "ห้องนิรภัยและประเมินมูลค่า", icon: "shield", href: "/vault", keywords: "vault ห้องนิรภัย ประเมิน มูลค่า" },
  { id: "m-news", group: "menu", title: "ข่าวสาร", subtitle: "ข่าวและคู่มือการ์ดสะสม", icon: "news", href: "/news", keywords: "news บทความ คู่มือ" },
  { id: "m-cart", group: "menu", title: "ตะกร้าสินค้า", subtitle: "รายการที่รอชำระเงิน", icon: "bag", href: "/checkout", keywords: "cart checkout ชำระเงิน จ่ายเงิน" },
  { id: "m-orders", group: "menu", title: "คำสั่งซื้อของฉัน", subtitle: "ติดตามสถานะและการชำระเงิน", icon: "receipt", href: "/orders", keywords: "orders ออเดอร์ สถานะ" },
  { id: "m-purchases", group: "menu", title: "สถานะการซื้อสินค้า", subtitle: "การจัดส่งและยืนยันรับสินค้า", icon: "truck", href: "/purchases", keywords: "purchases จัดส่ง พัสดุ tracking" },
  { id: "m-wins", group: "menu", title: "ของที่ประมูลชนะ", subtitle: "ชำระเงินภายใน 24 ชั่วโมง", icon: "trophy", href: "/wins", keywords: "wins ชนะประมูล" },
  { id: "m-wishlist", group: "menu", title: "รายการโปรด", subtitle: "การ์ดที่กดหัวใจไว้", icon: "heart", href: "/wishlist", keywords: "wishlist favorite อยากได้" },
  { id: "m-points", group: "menu", title: "แต้ม TT Points", subtitle: "ประวัติแต้มและส่วนลด", icon: "coins", href: "/points", keywords: "points แต้ม คะแนน ส่วนลด" },
  { id: "m-addresses", group: "menu", title: "ที่อยู่สำหรับจัดส่ง", subtitle: "เพิ่มหรือแก้ไขที่อยู่", icon: "map", href: "/addresses", keywords: "address ที่อยู่" },
  { id: "m-profile", group: "menu", title: "บัญชีของฉัน", subtitle: "ข้อมูลส่วนตัวและการตั้งค่า", icon: "user", href: "/profile", keywords: "profile account บัญชี ตั้งค่า แจ้งเตือน" },
  { id: "m-shop", group: "menu", title: "ร้านของฉัน", subtitle: "ลงขายและจัดการการ์ด", icon: "package", href: "/shop", keywords: "shop ลงขาย ขายการ์ด ร้าน สต็อก" },
  { id: "m-auth", group: "menu", title: "เข้าสู่ระบบ / สมัครสมาชิก", subtitle: "เข้าใช้งานบัญชี Taletails", icon: "login", href: "/auth", keywords: "login register สมัคร", guestOnly: true },
  { id: "m-admin", group: "menu", title: "หลังบ้าน", subtitle: "แดชบอร์ดผู้ดูแล", icon: "dashboard", href: "/admin", keywords: "admin แอดมิน dashboard", adminOnly: true },
  { id: "m-admin-orders", group: "menu", title: "หลังบ้าน · คำสั่งซื้อ", subtitle: "ตรวจสลิปและยืนยันการชำระเงิน", icon: "receipt", href: "/admin/orders", keywords: "admin orders สลิป", adminOnly: true },
  { id: "m-admin-members", group: "menu", title: "หลังบ้าน · สมาชิก", subtitle: "จัดการสมาชิกและสิทธิ์", icon: "users", href: "/admin/members", keywords: "admin members สมาชิก แบน", adminOnly: true },
  { id: "m-admin-news", group: "menu", title: "หลังบ้าน · ข่าวสาร", subtitle: "เขียนและจัดการข่าว", icon: "news", href: "/admin/news", keywords: "admin news ข่าว", adminOnly: true },
];

/**
 * ค้นหาทั้งเว็บ: การ์ดในตลาด, รอบประมูล, สถิติราคา, ข่าวสาร และเมนู
 * อ่านเฉพาะข้อมูลที่เปิดสาธารณะอยู่แล้ว (การ์ดที่เผยแพร่, ข่าวที่เผยแพร่)
 */
export function useGlobalSearch(
  query: string,
  opts: { enabled: boolean; isAdmin: boolean; isAuthenticated: boolean },
) {
  const debounced = useDebounced(query, 220);
  const tokens = useMemo(() => tokenize(debounced), [debounced]);
  // ใช้คำที่ยาวที่สุดค้นจากฐานข้อมูล แล้วกรองทุกคำอีกรอบฝั่งเครื่อง
  const serverTerm = useMemo(
    () => sanitize([...tokens].sort((a, b) => b.length - a.length)[0] ?? ""),
    [tokens],
  );
  const active = opts.enabled && serverTerm.length >= 1;

  const cardsQuery = useQuery({
    queryKey: ["global-search", "cards", serverTerm],
    enabled: active,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const p = `%${serverTerm}%`;
      const { data, error } = await supabase
        .from("cards")
        .select(
          "id, name, set_name, card_no, certification_no, grade, grading_company, language, rarity, price, images, sale_type, status, stock_quantity, updated_at, auctions (id, current_price, bid_count, end_time, status)",
        )
        .eq("is_published", true)
        .in("status", ["available", "locked", "sold"])
        .or(
          [
            `name.ilike.${p}`,
            `set_name.ilike.${p}`,
            `card_no.ilike.${p}`,
            `certification_no.ilike.${p}`,
            `grade.ilike.${p}`,
            `grading_company.ilike.${p}`,
            `rarity.ilike.${p}`,
            `language.ilike.${p}`,
          ].join(","),
        )
        .order("updated_at", { ascending: false })
        .limit(60);
      if (error) {
        if (isPermissionError(error)) return [] as CardSearchRow[];
        throw error;
      }
      return (data ?? []) as unknown as CardSearchRow[];
    },
  });

  const newsQuery = useQuery({
    queryKey: ["global-search", "news", serverTerm],
    enabled: active,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    queryFn: async () => {
      const p = `%${serverTerm}%`;
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, excerpt, category_tag, published_at")
        .eq("is_published", true)
        .or([`title.ilike.${p}`, `excerpt.ilike.${p}`, `category_tag.ilike.${p}`].join(","))
        .order("published_at", { ascending: false })
        .limit(20);
      if (error) {
        if (isPermissionError(error)) return [] as ArticleSearchRow[];
        throw error;
      }
      return (data ?? []) as ArticleSearchRow[];
    },
  });

  // สถิติราคาใช้ข้อมูลชุดเดียวกับหน้า /market (มีแคชอยู่แล้ว)
  const { cards: statCards } = useMarketStats();

  const results = useMemo<SearchResult[]>(() => {
    const out: SearchResult[] = [];
    const menuVisible = MENU_ITEMS.filter(
      (m) => (!m.adminOnly || opts.isAdmin) && (!m.guestOnly || !opts.isAuthenticated),
    );

    if (tokens.length === 0) return out;

    const now = Date.now();
    const auctions: SearchResult[] = [];
    for (const row of cardsQuery.data ?? []) {
      const hay = [
        row.name,
        row.set_name,
        row.card_no,
        row.certification_no,
        row.grade,
        row.grading_company,
        row.rarity,
        row.language,
      ]
        .filter(Boolean)
        .join(" ");
      if (!matchesAll(hay, tokens)) continue;
      const grade = gradeText(row.grading_company, row.grade);
      const sub = [row.set_name, grade, row.card_no ? `#${row.card_no}` : null]
        .filter(Boolean)
        .join(" · ");
      const image = row.images?.[0] ?? null;

      if (row.sale_type === "fixed_price") {
        if (isSoldExpiredFromMarket(row.status, row.updated_at)) continue;
        const stock = row.stock_quantity ?? 1;
        const note =
          row.status === "sold" || stock <= 0
            ? "ขายแล้ว"
            : row.status === "locked"
              ? "รอชำระเงิน"
              : stock <= 3
                ? `เหลือ ${stock} ชิ้น`
                : "พร้อมขาย";
        out.push({
          id: `c-${row.id}`,
          group: "market",
          title: row.name,
          subtitle: sub,
          image,
          href: `/product/${row.id}`,
          right: { kind: "price", price: Number(row.price), note },
        });
      } else {
        const auction = [...(row.auctions ?? [])].sort(
          (a, b) => new Date(b.end_time).getTime() - new Date(a.end_time).getTime(),
        )[0];
        if (!auction) continue;
        const endMs = new Date(auction.end_time).getTime();
        const isLive = auction.status === "active" && endMs > now;
        // รอบที่ปิดไปนานเกิน 14 วันไม่ต้องแสดง
        if (!isLive && now - endMs > 14 * DAY) continue;
        auctions.push({
          id: `a-${row.id}`,
          group: "auction",
          title: row.name,
          subtitle: `ราคาปัจจุบัน ฿${Number(auction.current_price).toLocaleString("th-TH")} · ${auction.bid_count} บิด`,
          image,
          href: `/card/${row.id}`,
          right: isLive
            ? { kind: "live", endTime: auction.end_time }
            : { kind: "ended", label: auction.bid_count > 0 ? "ปิดประมูลแล้ว" : "ไม่มีผู้เสนอราคา" },
        });
      }
    }
    // รอบประมูลที่ยังเปิดอยู่ขึ้นก่อน
    const rank = (r: SearchResult) => (r.right?.kind === "live" ? 0 : 1);
    out.push(...auctions.sort((a, b) => rank(a) - rank(b)));

    for (const s of statCards) {
      if (!matchesAll(`${s.cardName} ${s.setName} ${s.grade}`, tokens)) continue;
      out.push({
        id: `s-${s.id}`,
        group: "stats",
        title: s.cardName,
        subtitle: `${s.setName} · ${s.grade} · ราคาตลาด ฿${(s.marketPrice ?? s.lastPrice).toLocaleString("th-TH")}`,
        image: s.imageUrl || null,
        href: `/market/${s.id}`,
        right: { kind: "change", pct: s.change24h },
      });
    }

    for (const a of newsQuery.data ?? []) {
      if (!matchesAll(`${a.title} ${a.excerpt ?? ""} ${a.category_tag}`, tokens)) continue;
      out.push({
        id: `n-${a.id}`,
        group: "news",
        title: a.title,
        subtitle: `${a.category_tag} · ${thDate.format(new Date(a.published_at))}`,
        icon: "news",
        href: `/news/${a.id}`,
      });
    }

    for (const m of menuVisible) {
      if (!matchesAll(`${m.title} ${m.subtitle ?? ""} ${m.keywords ?? ""}`, tokens)) continue;
      out.push(m);
    }

    return out;
  }, [tokens, cardsQuery.data, newsQuery.data, statCards, opts.isAdmin, opts.isAuthenticated]);

  const isLoading =
    tokens.join(" ") !== tokenize(query).join(" ") ||
    (active && (cardsQuery.isFetching || newsQuery.isFetching));

  return { results, tokens, isLoading };
}
