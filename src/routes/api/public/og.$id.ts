import { createFileRoute } from "@tanstack/react-router";

import {
  absoluteImage,
  fetchSeoAuctionEnd,
  fetchSeoCard,
  gradeLabel,
  thaiEndLabel,
} from "@/lib/seo";

/**
 * รูปแชร์แนวนอน 1200×630 ของสินค้า/ประมูล ใช้ใน og:image ของ /product/$id และ /card/$id
 * อ่านข้อมูลด้วยสิทธิ์ผู้เยี่ยมชม (RLS) เหมือนหน้าเว็บ · สร้างไม่สำเร็จ → พาไปรูปการ์ดเดิม ลิงก์แชร์ไม่เสีย
 */
export const Route = createFileRoute("/api/public/og/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const card = await fetchSeoCard(params.id);
        if (!card || !card.isPublished) {
          return new Response("not found", { status: 404 });
        }

        const isAuction = card.saleType === "auction";
        const end = isAuction ? await fetchSeoAuctionEnd(card.id) : null;
        const closedLabel = isAuction
          ? end
            ? null
            : "ประมูลจบแล้ว"
          : card.status === "sold"
            ? "ขายแล้ว"
            : null;

        try {
          const { renderOgPng } = await import("@/lib/og-image.server");
          const png = await renderOgPng({
            name: card.name,
            setName: card.setName,
            grade: gradeLabel(card),
            kind: card.saleType,
            price: card.price,
            endLabel: end ? thaiEndLabel(end) : null,
            closedLabel,
            image: card.image,
          });
          return new Response(new Uint8Array(png), {
            headers: {
              "Content-Type": "image/png",
              // URL มีเลขเวอร์ชัน (สถานะ-ราคา) อยู่แล้ว จึงเก็บไว้ได้นาน — ข้อมูลเปลี่ยน URL ก็เปลี่ยน
              "Cache-Control": "public, max-age=3600, s-maxage=86400",
            },
          });
        } catch (e) {
          console.error("[og] render failed", params.id, e);
          return Response.redirect(absoluteImage(card.image), 302);
        }
      },
    },
  },
});
