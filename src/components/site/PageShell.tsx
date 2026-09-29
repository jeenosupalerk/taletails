import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader, type Crumb } from "@/components/site/PageHeader";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

export function PageShell({
  title,
  description,
  trail,
  icon,
  aside,
  children,
}: {
  /** ยังรับค่าจากหน้าเดิมได้ แต่ไม่แสดงแล้ว (ซ้ำกับชื่อหน้า) */
  eyebrow?: string | undefined;
  title: string;
  description?: string | undefined;
  /** เส้นทางระดับบน (ไม่รวมหน้าปัจจุบัน) ถ้าไม่ส่งจะเป็น หน้าแรก */
  trail?: Crumb[] | undefined;
  icon?: LucideIcon | undefined;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <div className="mx-auto max-w-7xl px-4 pt-4 sm:px-6 lg:px-8">
          <PageHeader
            title={title}
            {...(trail ? { trail } : {})}
            {...(icon ? { icon } : {})}
            {...(description ? { description } : {})}
            aside={aside}
          />
        </div>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
