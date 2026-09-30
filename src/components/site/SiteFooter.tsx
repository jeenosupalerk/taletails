import { Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, History } from "lucide-react";

import taletailsLogo from "@/assets/taletails-logo.jpg";

/**
 * ทุกลิงก์ต้องพาไปหน้าที่มีจริงและตรงกับชื่อ — เดิมทุกข้อในคอลัมน์ชี้ไปหน้าเดียวกัน
 * (เช่น "ติดต่อเรา" → ห้องนิรภัย) ซึ่งทำให้เว็บดูไม่น่าเชื่อถือ ยังไม่มีหน้าไหนก็อย่าใส่ลิงก์
 */
const linkCls = "text-sm text-muted-foreground transition-colors hover:text-primary";

/** หน้านโยบาย/ติดต่อ — ใช้ทั้ง footer มือถือและจอกว้าง */
const LEGAL_LINKS = [
  { to: "/contact", label: "ติดต่อเรา" },
  { to: "/purchase-policy", label: "นโยบายการซื้อและจัดส่ง" },
  { to: "/terms", label: "เงื่อนไขการใช้งาน" },
  { to: "/privacy", label: "ความเป็นส่วนตัว" },
] as const;

const chipCls =
  "inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-card px-4 text-[13px] font-semibold transition-[transform,colors] duration-150 active:scale-95 active:bg-secondary";

/**
 * มือถือ/แท็บเล็ต (ที่มีแถบเมนูล่าง): footer สั้นแบบแอป — โลโก้ + ทางลัดที่ไม่ซ้ำกับแถบล่าง + ลิขสิทธิ์
 * ลิงก์ทั้งหมดของเวอร์ชันจอกว้างมีอยู่ในแถบเมนูล่างและหน้าอื่นแล้ว จึงไม่ต้องซ้อนซ้ำ
 * pb-28 กันแถบเมนูล่างที่ลอยอยู่ทับบรรทัดลิขสิทธิ์
 */
function CompactFooter() {
  return (
    <footer className="border-t border-border bg-surface-footer px-4 pt-6 pb-28 lg:hidden">
      <div className="mx-auto max-w-xl">
        <Link to="/" className="flex items-center gap-3">
          <img
            src={taletailsLogo}
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-cover"
            loading="lazy"
          />
          <span>
            <span className="block font-display text-lg leading-tight font-bold">
              Tale<span className="text-gradient-ember">tails</span>
            </span>
            <span className="block text-xs text-muted-foreground">
              ตลาดการ์ดสะสม ราคากลางจากการขายจริง
            </span>
          </span>
        </Link>

        <nav aria-label="ทางลัดท้ายหน้า" className="mt-4 flex flex-wrap gap-2">
          <Link to="/market" search={{ grade: "sqc" }} className={chipCls}>
            <BadgeCheck className="h-4 w-4 text-primary" />
            ราคากลางเกรดไทย
          </Link>
          <Link to="/auctions" search={{ id: undefined, status: "completed" }} className={chipCls}>
            <History className="h-4 w-4 text-primary" />
            ผลการประมูล
          </Link>
          <Link to="/points" className={chipCls}>
            <Coins className="h-4 w-4 text-primary" />
            TT Points
          </Link>
        </nav>

        <nav
          aria-label="นโยบายและการติดต่อ"
          className="mt-3 flex flex-wrap justify-center gap-x-1 text-xs text-muted-foreground"
        >
          {LEGAL_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="inline-flex min-h-11 items-center px-2 underline-offset-4 hover:text-primary hover:underline active:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <p className="mt-1 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} Taletails Collectibles สงวนลิขสิทธิ์
        </p>
      </div>
    </footer>
  );
}

export function SiteFooter() {
  return (
    <>
      <CompactFooter />
      <FullFooter />
    </>
  );
}

/** จอกว้าง (แถบเมนูล่างซ่อนอยู่): footer แบบคอลัมน์เต็ม */
function FullFooter() {
  return (
    <footer className="hidden border-t border-border bg-surface-footer lg:block">
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
              <Link to="/points" className={linkCls}>
                แต้มสะสม TT Points
              </Link>
            </li>
            {LEGAL_LINKS.map((l) => (
              <li key={l.to}>
                <Link to={l.to} className={linkCls}>
                  {l.label}
                </Link>
              </li>
            ))}
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
