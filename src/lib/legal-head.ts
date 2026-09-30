/** meta ที่ทุกหน้านโยบายใช้ร่วมกัน (เปิดให้ค้นหาได้: ช่วยความน่าเชื่อถือ) */
export function legalHead(path: string, title: string, description: string, siteUrl: string) {
  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${siteUrl}${path}` },
    ],
    links: [{ rel: "canonical", href: `${siteUrl}${path}` }],
  };
}
