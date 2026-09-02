import article1 from "@/assets/article-1.jpg";
import article2 from "@/assets/article-2.jpg";
import article3 from "@/assets/article-3.jpg";
import article4 from "@/assets/article-4.jpg";

export interface Article {
  id: string;
  title: string;
  categoryTag: string;
  thumbnailUrl: string;
  /** ISO date string */
  publishedDate: string;
}

export const articles: Article[] = [
  {
    id: "art-3001",
    title: "เตรียมการ์ดให้พร้อมก่อนส่งเข้าเกรดอย่างมืออาชีพ",
    categoryTag: "คู่มือ",
    thumbnailUrl: article1,
    publishedDate: "2026-08-18",
  },
  {
    id: "art-3002",
    title: "เบื้องหลังห้องแล็บตรวจสอบ: ผู้เชี่ยวชาญดูอะไรบ้าง",
    categoryTag: "ตรวจสอบความแท้",
    thumbnailUrl: article2,
    publishedDate: "2026-08-12",
  },
  {
    id: "art-3003",
    title: "สรุปฤดูงานอีเวนต์: ชุดไหนราคาขยับแรงที่สุด",
    categoryTag: "ตลาด",
    thumbnailUrl: article3,
    publishedDate: "2026-08-05",
  },
  {
    id: "art-3004",
    title: "กล่องยังไม่แกะกลับมาแล้ว — 5 กล่องที่ควรถือยาว",
    categoryTag: "การลงทุน",
    thumbnailUrl: article4,
    publishedDate: "2026-07-29",
  },
];

export const getLatestArticles = (): Article[] =>
  [...articles].sort(
    (a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime(),
  );

export const getArticleById = (id: string): Article | undefined =>
  articles.find((a) => a.id === id);
