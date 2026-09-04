import { createFileRoute } from "@tanstack/react-router";
import { Lock, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import { TrustStrip } from "@/components/sections/TrustStrip";
import { PageShell } from "@/components/site/PageShell";

const title = "ห้องนิรภัย — Taletails";
const description =
  "ฝากการ์ดของคุณไว้ในห้องนิรภัยควบคุมอุณหภูมิ มีประกัน ตรวจสอบความแท้ และจัดส่งเมื่อคุณต้องการ";

const steps = [
  {
    icon: PackageCheck,
    title: "1. ส่งการ์ดเข้าระบบ",
    copy: "แพ็กการ์ดตามคู่มือ แล้วส่งเข้าศูนย์รับของ Taletails ฟรีค่าจัดส่งขาเข้า",
  },
  {
    icon: ShieldCheck,
    title: "2. ตรวจสอบและถ่ายภาพ",
    copy: "ทีมผู้เชี่ยวชาญตรวจสอบความแท้ ระบุเกรด และบันทึกรหัสการ์ดประจำใบ",
  },
  {
    icon: Lock,
    title: "3. เก็บในห้องนิรภัย",
    copy: "จัดเก็บในห้องควบคุมอุณหภูมิพร้อมประกันมูลค่าเต็มจำนวน",
  },
  {
    icon: Truck,
    title: "4. ขายหรือเรียกคืน",
    copy: "ลงประมูล ลงขายในตลาด หรือขอจัดส่งกลับบ้านได้ทุกเมื่อ",
  },
];

const SITE_URL = "https://taletails-test.lovable.app";
const OG_IMAGE = `${SITE_URL}/taletails-logo.jpg`;

export const Route = createFileRoute("/vault")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: `${SITE_URL}/vault` },
      { property: "og:image", content: OG_IMAGE },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: `${SITE_URL}/vault` }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "หน้าแรก", item: `${SITE_URL}/` },
            {
              "@type": "ListItem",
              position: 2,
              name: "ประเมินการ์ดสะสม",
              item: `${SITE_URL}/vault`,
            },
          ],
        }),
      },
    ],
  }),
  component: VaultPage,
});

function VaultPage() {
  return (
    <PageShell
      eyebrow="ความปลอดภัย"
      title="ห้องนิรภัย Taletails"
      description="ฝากการ์ดของคุณไว้กับเรา ปลอดภัย มีประกัน และพร้อมขายได้ทันทีในคลิกเดียว"
    >
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map(({ icon: Icon, title: stepTitle, copy }) => (
            <div key={stepTitle} className="surface-panel p-5">
              <span className="flex min-h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                <Icon className="h-5 w-5" />
              </span>
              <h2 className="mt-4 font-display text-base font-semibold">{stepTitle}</h2>
              <p className="mt-1.5 text-sm text-muted-foreground">{copy}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="pb-16">
        <TrustStrip />
      </div>
    </PageShell>
  );
}
