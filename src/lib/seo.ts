import { supabase } from "@/integrations/supabase/client";

/** โดเมนจริงของร้าน (มี www) ใช้กับ canonical / og:url / sitemap ทุกที่ */
export const SITE_URL = "https://www.taletails-trade.com";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

/** รูปที่เก็บไว้เป็น path ในเว็บ (เช่น /cards/card-1.jpg) ต้องเป็น URL เต็มถึงจะใช้กับ og:image ได้ */
export function absoluteImage(url: string | null | undefined): string {
  if (!url) return DEFAULT_OG_IMAGE;
  return url.startsWith("http") ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

/** ตัดข้อความให้พอดีกับผลค้นหา (description ~155 ตัวอักษร) */
export function clip(text: string, max = 155): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ข้อมูลการ์ดเท่าที่ต้องใช้ทำ SEO (อ่านด้วยสิทธิ์ผู้เยี่ยมชมทั่วไป) */
export interface SeoCard {
  id: string;
  name: string;
  setName: string | null;
  grade: string | null;
  gradingCompany: string | null;
  price: number;
  image: string | null;
  status: "available" | "locked" | "sold";
  saleType: "auction" | "fixed_price";
  isPublished: boolean;
}

/**
 * ดึงการ์ดหนึ่งใบตอนเรนเดอร์ฝั่งเซิร์ฟเวอร์ เพื่อให้ title/รูปแชร์/ข้อมูลโครงสร้างมีชื่อและราคาจริง
 * ล้มเหลวเมื่อไรก็คืน null (หน้ายังเปิดได้ตามปกติ แค่ใช้หัวเรื่องกลาง)
 */
export async function fetchSeoCard(id: string): Promise<SeoCard | null> {
  if (!UUID_RE.test(id)) return null;
  try {
    const { data, error } = await supabase
      .from("cards")
      .select(
        "id, name, set_name, grade, grading_company, price, images, status, sale_type, is_published",
      )
      .eq("id", id)
      .maybeSingle();
    if (error || !data) return null;
    const r = data as unknown as {
      id: string;
      name: string;
      set_name: string | null;
      grade: string | null;
      grading_company: string | null;
      price: number;
      images: string[] | null;
      status: SeoCard["status"];
      sale_type: SeoCard["saleType"];
      is_published: boolean | null;
    };
    return {
      id: r.id,
      name: r.name,
      setName: r.set_name,
      grade: r.grade,
      gradingCompany: r.grading_company,
      price: Number(r.price ?? 0),
      image: r.images?.[0] ?? null,
      status: r.status,
      saleType: r.sale_type,
      isPublished: r.is_published ?? true,
    };
  } catch {
    return null;
  }
}

/** ชื่อเรียกเกรดสั้น ๆ เช่น "SQC 10" / "PSA 9" / "RAW" */
export function gradeLabel(c: Pick<SeoCard, "grade" | "gradingCompany">): string {
  const g = (c.grade ?? "").trim();
  const co = (c.gradingCompany ?? "").trim();
  if (!g || g === "-") return "";
  return co && co !== "-" && !g.toUpperCase().includes(co.toUpperCase()) ? `${co} ${g}` : g;
}

/** ข้อมูลโครงสร้าง Product ให้ Google แสดงราคา/สถานะสินค้าในผลค้นหา (เฉพาะขายตายตัว) */
export function productJsonLd(card: SeoCard, url: string) {
  const grade = gradeLabel(card);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: [card.name, card.setName && card.setName !== "-" ? card.setName : "", grade]
      .filter(Boolean)
      .join(" "),
    image: [absoluteImage(card.image)],
    brand: {
      "@type": "Brand",
      name: card.setName && card.setName !== "-" ? card.setName : "Taletails",
    },
    url,
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "THB",
      price: card.price,
      availability:
        card.status === "available" && card.isPublished
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: `${SITE_URL}${it.path}`,
    })),
  };
}
