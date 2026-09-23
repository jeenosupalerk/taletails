import { Link } from "@tanstack/react-router";

import taletailsLogo from "@/assets/taletails-logo.jpg";

/**
 * ทุกลิงก์ต้องพาไปหน้าที่มีจริงและตรงกับชื่อ — เดิมทุกข้อในคอลัมน์ชี้ไปหน้าเดียวกัน
 * (เช่น "ติดต่อเรา" → ห้องนิรภัย) ซึ่งทำให้เว็บดูไม่น่าเชื่อถือ ยังไม่มีหน้าไหนก็อย่าใส่ลิงก์
 */
const linkCls = "text-sm text-muted-foreground transition-colors hover:text-primary";

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:px-8">
        <div>
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={taletailsLogo}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 rounded-lg object-cover"
              loading="lazy"
            />
            <span className="font-display text-lg font-bold">
              Tale<span className="text-gradient-ember">tails</span>
            </span>
          </Link>
          {/* ไม่ระบุเวลาประมูลตายตัว เพราะร้านยังไม่มีตารางเปิดรอบแน่นอน */}
          <p className="mt-4 max-w-xs text-sm text-muted-foreground">
            ตลาดซื้อขายและประมูลการ์ดสะสม พร้อมราคากลางจากการขายจริง รวมถึงราคาการ์ดเกรดไทย (SQC)
          </p>
        </div>

        <div>
          <h4 className="text-sm font-semibold">ตลาดซื้อขาย</h4>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/marketplace" className={linkCls}>
                เลือกซื้อการ์ด
              </Link>
            </li>
            <li>
              <Link to="/market" className={linkCls}>
                สถิติราคาตลาด
              </Link>
            </li>
            <li>
              <Link to="/market" search={{ grade: "sqc" }} className={linkCls}>
                ราคากลางเกรดไทย (SQC)
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">การประมูล</h4>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link
                to="/auctions"
                search={{ id: undefined, status: undefined }}
                className={linkCls}
              >
                ประมูลทั้งหมด
              </Link>
            </li>
            <li>
              <Link
                to="/auctions"
                search={{ id: undefined, status: "completed" }}
                className={linkCls}
              >
                ผลการประมูล
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-sm font-semibold">Taletails</h4>
          <ul className="mt-4 space-y-2.5">
            <li>
              <Link to="/vault" className={linkCls}>
                ห้องนิรภัย
              </Link>
            </li>
            <li>
              <Link to="/news" className={linkCls}>
                ข่าวสาร
              </Link>
            </li>
            <li>
              <Link to="/points" className={linkCls}>
                แต้มสะสม TT Points
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-6 text-xs text-muted-foreground sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Taletails Collectibles สงวนลิขสิทธิ์</p>
        </div>
      </div>
    </footer>
  );
}
