import { createFileRoute, Link } from "@tanstack/react-router";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Loader2 } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { getArticleById } from "@/data/articles";
import { useArticle, toArticle, type DbArticle } from "@/hooks/useArticles";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL, absoluteImage, clip } from "@/lib/seo";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const Route = createFileRoute("/news/$id")({
  // บทความจริงจากฐานข้อมูลก็ต้องมีหัวเรื่อง/รูปแชร์ตอนเรนเดอร์ฝั่งเซิร์ฟเวอร์ ไม่ใช่เฉพาะบทความตัวอย่าง
  loader: async ({ params }) => {
    const mock = getArticleById(params.id) ?? null;
    if (mock) return { article: mock };
    try {
      const { data } = await supabase
        .from("articles")
        .select(
          "id, title, category_tag, excerpt, content, thumbnail_url, is_published, published_at, created_at",
        )
        .eq("id", params.id)
        .eq("is_published", true)
        .maybeSingle();
      return { article: data ? toArticle(data as DbArticle) : null };
    } catch {
      return { article: null };
    }
  },
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const url = `${SITE_URL}/news/${params.id}`;
    if (!a) {
      return {
        meta: [{ title: "บทความ — Taletails" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${a.title} | Taletails`;
    const excerpt = "excerpt" in a && typeof a.excerpt === "string" ? a.excerpt : "";
    const description = clip(
      excerpt || `${a.categoryTag}: ${a.title} อ่านบทวิเคราะห์และคู่มือการ์ดสะสมจาก Taletails`,
    );
    const image = absoluteImage(a.thumbnailUrl);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: url },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: a.title,
            description,
            image: [image],
            datePublished: a.publishedDate,
            mainEntityOfPage: url,
            author: { "@type": "Organization", name: "Taletails" },
            publisher: {
              "@type": "Organization",
              name: "Taletails",
              logo: { "@type": "ImageObject", url: `${SITE_URL}/icon-512.png` },
            },
          }),
        },
      ],
    };
  },
  component: ArticlePage,
});

const FALLBACK_BODY = [
  "ตลาดการ์ดสะสมไทยเติบโตต่อเนื่อง นักสะสมให้ความสำคัญกับการตรวจสอบความแท้และการเก็บรักษามากขึ้น บทความนี้สรุปประเด็นสำคัญที่ควรรู้ก่อนตัดสินใจซื้อ ขาย หรือส่งการ์ดเข้าเกรด",
  "ทีมงาน Taletails รวบรวมข้อมูลจากผู้เชี่ยวชาญและสถิติการประมูลในแพลตฟอร์ม เพื่อให้คุณเห็นภาพราคาจริงและแนวโน้มของแต่ละชุดการ์ดอย่างชัดเจน",
  "หากคุณกำลังมองหาการ์ดที่ผ่านการตรวจสอบแล้ว สามารถดูรายการในตลาดซื้อขาย หรือเข้าร่วมห้องประมูลสดที่เปิดทุกคืนเวลา 20:00 น.",
];

function ArticlePage() {
  const { article: mock } = Route.useLoaderData();
  const { id } = Route.useParams();
  const db = useArticle(id);

  const article = mock ?? db.data ?? null;

  if (!article) {
    return (
      <PageShell
        title="บทความ"
        trail={[
          { label: "หน้าแรก", to: "/" },
          { label: "ข่าวสารและคู่มือ", to: "/news" },
        ]}
      >
        <div className="grid place-items-center py-24">
          {db.isLoading ? (
            <LogoLoader size={64} />
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">ไม่พบบทความนี้</p>
              <Link
                to="/news"
                className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
              >
                ← กลับไปหน้าข่าวสารทั้งหมด
              </Link>
            </div>
          )}
        </div>
      </PageShell>
    );
  }

  const content = (article as { content?: string }).content?.trim();
  const paragraphs = content ? content.split(/\n{1,}/).filter(Boolean) : FALLBACK_BODY;

  return (
    <PageShell
      title="บทความ"
      trail={[
        { label: "หน้าแรก", to: "/" },
        { label: "ข่าวสารและคู่มือ", to: "/news" },
      ]}
    >
      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <p className="text-xs font-semibold text-primary">
          {article.categoryTag} · {dateFormatter.format(new Date(article.publishedDate))}
        </p>
        <h2 className="font-display mt-2 mb-6 text-2xl font-bold sm:text-3xl">{article.title}</h2>
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          width={1024}
          height={640}
          className="aspect-[16/10] w-full rounded-3xl object-cover shadow-card"
        />
        <div className="mt-8 space-y-5 text-sm leading-relaxed text-foreground/80 sm:text-base">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="mt-10">
          <Link to="/news" className="text-sm font-semibold text-primary hover:underline">
            ← กลับไปหน้าข่าวสารทั้งหมด
          </Link>
        </div>
      </article>
    </PageShell>
  );
}
