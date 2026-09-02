import { Link } from "@tanstack/react-router";

import { SectionHeading } from "@/components/site/SectionHeading";
import { getLatestArticles, type Article } from "@/data/articles";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function ArticleCard({ article }: { article: Article }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-card">
      <Link to="/news/$id" params={{ id: article.id }} className="block">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={article.thumbnailUrl}
          alt={article.title}
          width={1024}
          height={640}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs">
          <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold text-primary">
            {article.categoryTag}
          </span>
          <time dateTime={article.publishedDate} className="text-muted-foreground">
            {dateFormatter.format(new Date(article.publishedDate))}
          </time>
        </div>
        <h3 className="mt-3 font-display text-base leading-snug font-semibold transition-colors group-hover:text-primary">
          {article.title}
        </h3>
      </div>
      </Link>
    </article>
  );
}

export function ArticlesSection({ showHeading = true }: { showHeading?: boolean }) {
  const latest = getLatestArticles();

  return (
    <section id="news" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {showHeading && (
        <SectionHeading
          eyebrow="จากถ้ำจิ้งจอก"
          title="ข่าวสาร"
          description="เคล็ดลับการเกรด บทวิเคราะห์ตลาด และเบื้องหลังการตรวจสอบความแท้"
          actionLabel="อ่านทั้งหมด"
          actionTo="/news"
        />
      )}
      {!showHeading && <h2 className="sr-only">บทความล่าสุด</h2>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {latest.map((article) => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </section>
  );
}
