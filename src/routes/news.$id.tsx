import { createFileRoute, Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";

import { PageShell } from "@/components/site/PageShell";
import { getArticleById } from "@/data/articles";
import { useArticle } from "@/hooks/useArticles";

const SITE_URL = "https://taletails-test.lovable.app";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const Route = createFileRoute("/news/$id")({
  loader: ({ params }) => ({ article: getArticleById(params.id) ?? null }),
  head: ({ loaderData, params }) => {
    const a = loaderData?.article;
    const title = a ? `${a.title} — Taletails` : "บทความ — Taletails";
    const description = a
      ? `${a.categoryTag}: ${a.title} อ่านบทวิเคราะห์และคู่มือการ์ดสะสมจาก Taletails`
      : "อ่านข่าวสารและคู่มือการ์ดสะสมจาก Taletails";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE_URL}/news/${params.id}` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/news/${params.id}` }],
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
      <PageShell eyebrow="ข่าวสาร" title="บทความ" description="">
        <div className="grid place-items-center py-24">
          {db.isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
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
      eyebrow={article.categoryTag}
      title={article.title}
      description={dateFormatter.format(new Date(article.publishedDate))}
    >
      <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
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
