import { Lock, ShieldCheck, Truck, Users } from "lucide-react";

const items = [
  { icon: ShieldCheck, title: "ตรวจสอบความแท้", copy: "ทุกใบผ่านผู้เชี่ยวชาญตั้งแต่วันแรกที่รับเข้า" },
  { icon: Lock, title: "เก็บในห้องนิรภัย", copy: "ควบคุมอุณหภูมิ พร้อมประกันมูลค่าเต็มจำนวน" },
  { icon: Truck, title: "ส่งเมื่อคุณสั่ง", copy: "ขอรับการ์ดกลับบ้านได้ทุกเมื่อที่ต้องการ" },
  { icon: Users, title: "นักสะสม 40,000 คน", copy: "ชุมชนผู้ซื้อและผู้ขายที่ยืนยันตัวตนแล้ว" },
];

export function TrustStrip() {
  return (
    <section id="vault" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-2 gap-4 rounded-3xl border border-border bg-surface-footer p-5 sm:p-6 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, copy }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex min-h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <div>
              <p className="font-display text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{copy}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
