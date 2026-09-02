import { createFileRoute, Link, notFound } from "@tanstack/react-router";

import { PageShell } from "@/components/site/PageShell";
import { getArticleById } from "@/data/articles";

const SITE_URL = "https://taletails-test.lovable.app";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

export const Route = createFileRoute("/news/$id")({
  loader: ({ params }) => {
    const article = getArticleById(params.id);
    if (!article) throw notFound();
    return { article };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "ไม่พบบทความ — Taletails" }, { name: "robots", content: "noindex" }],
      };
    }
    const a = loaderData.article;
    const title = `${a.title} — Taletails`;
    const description = `${a.categoryTag}: ${a.title} อ่านบทวิเคราะห์และคู่มือการ์ดสะสมจาก Taletails`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { property: "og:url", content: `${SITE_URL}/news/${a.id}` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/news/${a.id}` }],
    };
  },
  component: ArticlePage,
});

function ArticlePage() {
  const { article } = Route.useLoaderData();

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
          <p>
            ตลาดการ์ดสะสมไทยเติบโตต่อเนื่อง นักสะสมให้ความสำคัญกับการตรวจสอบความแท้และการเก็บรักษามากขึ้น
            บทความนี้สรุปประเด็นสำคัญที่ควรรู้ก่อนตัดสินใจซื้อ ขาย หรือส่งการ์ดเข้าเกรด
          </p>
          <p>
            ทีมงาน Taletails รวบรวมข้อมูลจากผู้เชี่ยวชาญและสถิติการประมูลในแพลตฟอร์ม
            เพื่อให้คุณเห็นภาพราคาจริงและแนวโน้มของแต่ละชุดการ์ดอย่างชัดเจน
          </p>
          <p>
            หากคุณกำลังมองหาการ์ดที่ผ่านการตรวจสอบแล้ว สามารถดูรายการในตลาดซื้อขาย
            หรือเข้าร่วมห้องประมูลสดที่เปิดทุกคืนเวลา 20:00 น.
          </p>
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
