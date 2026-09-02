import { Link } from "@tanstack/react-router";

import taletailsLogo from "@/assets/taletails-logo.jpg";

const columns = [
  {
    title: "ตลาดซื้อขาย",
    to: "/marketplace" as const,
    links: ["เลือกซื้อการ์ด", "กล่องยังไม่แกะ", "การ์ดเกรดแล้ว", "ขายกับเรา"],
  },
  {
    title: "การประมูล",
    to: "/auctions" as const,
    links: ["กำลังประมูล", "ที่กำลังจะเปิด", "ผลการประมูล", "กติกาการเสนอราคา"],
  },
  {
    title: "เกี่ยวกับเรา",
    to: "/vault" as const,
    links: ["เกี่ยวกับ Taletails", "ห้องนิรภัย", "ร่วมงานกับเรา", "ติดต่อเรา"],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <img src={taletailsLogo} alt="" width={32} height={32} className="h-8 w-8 rounded-lg object-cover" loading="lazy" />
            <span className="font-display text-lg font-bold">
              Tale<span className="text-gradient-ember">tails</span>
            </span>
          </Link>
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            ถ้ำของนักสะสมการ์ดเกรดพรีเมียม ผู้ขายยืนยันตัวตน สินค้าเก็บในห้องนิรภัย
            และประมูลสดทุกคืน
          </p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-sm font-semibold">{col.title}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link}>
                  <Link
                    to={col.to}
                    className="text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    {link}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Taletails Collectibles สงวนลิขสิทธิ์</p>
          <p>ความเป็นส่วนตัว · เงื่อนไขการใช้งาน · การคุ้มครองผู้ซื้อ</p>
        </div>
      </div>
    </footer>
  );
}
