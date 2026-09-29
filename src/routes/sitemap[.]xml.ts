import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/lib/seo";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string | null;
}

const STATIC_ENTRIES: SitemapEntry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/auctions", changefreq: "hourly", priority: "0.9" },
  { path: "/marketplace", changefreq: "daily", priority: "0.9" },
  { path: "/market", changefreq: "daily", priority: "0.8" },
  { path: "/news", changefreq: "weekly", priority: "0.7" },
  { path: "/vault", changefreq: "monthly", priority: "0.5" },
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function iso(d: string | null | undefined) {
  if (!d) return null;
  const t = new Date(d);
  return Number.isNaN(t.getTime()) ? null : t.toISOString();
}

/** อ่านด้วยสิทธิ์ผู้เยี่ยมชม (RLS) จึงได้เฉพาะรายการที่สาธารณะเห็นได้จริง ล้มเหลวก็ข้ามเฉพาะส่วนนั้น */
async function dynamicEntries(): Promise<SitemapEntry[]> {
  const out: SitemapEntry[] = [];

  try {
    // สินค้าขายตายตัวที่เปิดขายอยู่
    const { data } = await supabase
      .from("cards")
      .select("id, updated_at")
      .eq("sale_type", "fixed_price")
      .eq("is_published", true)
      .in("status", ["available", "locked"])
      .order("updated_at", { ascending: false })
      .limit(2000);
    for (const r of (data ?? []) as { id: string; updated_at: string | null }[]) {
      out.push({
        path: `/product/${r.id}`,
        changefreq: "daily",
        priority: "0.8",
        lastmod: iso(r.updated_at),
      });
    }
  } catch {
    /* ข้าม */
  }

  try {
    // ห้องประมูลที่เปิดอยู่ตอนนี้
    const { data } = await supabase
      .from("auctions")
      .select("card_id, end_time")
      .eq("status", "active")
      .limit(500);
    for (const r of (data ?? []) as { card_id: string }[]) {
      out.push({ path: `/card/${r.card_id}`, changefreq: "hourly", priority: "0.7" });
    }
  } catch {
    /* ข้าม */
  }

  try {
    // บทความที่เผยแพร่แล้ว
    const { data } = await supabase
      .from("articles")
      .select("id, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false })
      .limit(500);
    for (const r of (data ?? []) as { id: string; published_at: string | null }[]) {
      out.push({
        path: `/news/${r.id}`,
        changefreq: "monthly",
        priority: "0.6",
        lastmod: iso(r.published_at),
      });
    }
  } catch {
    /* ข้าม */
  }

  try {
    // หน้าสถิติราคา: การ์ดรุ่นเดียวกัน (ชื่อ+ชุด+เกรด+บริษัทเกรด) ใช้ใบที่ขายล่าสุดเป็นตัวแทนหนึ่งหน้า
    const { data } = await supabase
      .from("cards")
      .select("id, name, set_name, grade, grading_company, updated_at")
      .eq("status", "sold")
      .order("updated_at", { ascending: false })
      .limit(2000);
    const seen = new Set<string>();
    for (const r of (data ?? []) as {
      id: string;
      name: string;
      set_name: string | null;
      grade: string | null;
      grading_company: string | null;
      updated_at: string | null;
    }[]) {
      const key = [r.name, r.set_name, r.grade, r.grading_company]
        .map((x) => (x ?? "").trim().toLowerCase())
        .join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        path: `/market/${r.id}`,
        changefreq: "weekly",
        priority: "0.6",
        lastmod: iso(r.updated_at),
      });
    }
  } catch {
    /* ข้าม */
  }

  return out;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries = [...STATIC_ENTRIES, ...(await dynamicEntries())];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${esc(SITE_URL + e.path)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            // แคช 10 นาที: สินค้าใหม่ขึ้นเร็วพอ แต่บอทรัว ๆ ไม่ทำให้ฐานข้อมูลหนัก
            "Cache-Control": "public, max-age=600",
          },
        });
      },
    },
  },
});
