import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Coins,
  Gavel,
  Radio,
  Timer,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import taletailsLogo from "@/assets/taletails-logo.jpg";
import { BackButton } from "@/components/site/BackButton";
import { SiteHeader } from "@/components/site/SiteHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAuctionById } from "@/data/auctions";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { pad, useCountdown } from "@/hooks/useCountdown";
import { thb } from "@/lib/cart";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SmartImage } from "@/components/ui/smart-image";

const SITE_URL = "https://taletails-test.lovable.app";

export const Route = createFileRoute("/auction/$id")({
  loader: ({ params }) => {
    const auction = getAuctionById(params.id);
    if (!auction) throw notFound();
    return { auction };
  },
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "ไม่พบรายการประมูล — Taletails" }, { name: "robots", content: "noindex" }],
      };
    }
    const a = loaderData.auction;
    const title = `ประมูลสด ${a.cardName} (${a.grade}) — Taletails`;
    const description = `ห้องประมูลสด ${a.cardName} จากชุด ${a.setName} เกรด ${a.grade} ราคาปัจจุบัน ${a.currentBid} บาท เสนอราคาแบบเรียลไทม์`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `${SITE_URL}/auction/${a.id}` },
      ],
      links: [{ rel: "canonical", href: `${SITE_URL}/auction/${a.id}` }],
    };
  },
  component: AuctionRoom,
});

function AuctionRoom() {
  const { auction } = Route.useLoaderData();
  const c = useCountdown(auction.endTime);
  const [shot, setShot] = useState(0);
  const [bid, setBid] = useState(auction.currentBid + 50);
  const requireAuth = useRequireAuth();

  const gallery = useMemo(() => [0, 1, 2, 3], []);
  const minNext = auction.currentBid + 50;
  const urgent = !!c && !c.isFinished && c.totalMs < 3 * 60 * 60 * 1000;

  const time = c
    ? [
        { v: pad(c.days * 24 + c.hours), l: "ชม." },
        { v: pad(c.minutes), l: "นาที" },
        { v: pad(c.seconds), l: "วินาที" },
      ]
    : [
        { v: "--", l: "ชม." },
        { v: "--", l: "นาที" },
        { v: "--", l: "วินาที" },
      ];

  return (
    <div className="dark min-h-screen bg-background text-foreground pb-32 lg:pb-10">
      <SiteHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav className="mb-4 flex items-center gap-3 text-xs text-muted-foreground">
          <BackButton />
          <Link
            to="/auctions"
            search={{ id: undefined }}
            className="transition-colors hover:text-primary"
          >
            กลับไปหน้ารวมการประมูล
          </Link>
        </nav>

        <h1 className="mb-4 font-display text-2xl font-bold sm:text-3xl">
          {auction.cardName}
          <span className="ml-2 text-sm font-medium text-muted-foreground">{auction.setName}</span>
        </h1>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_1fr]">
          {/* Card viewer */}
          <section className="relative overflow-hidden rounded-3xl border border-border bg-card">
            <div className="relative aspect-[4/3] bg-gradient-vault">
              <SmartImage
                src={auction.imageUrl}
                alt={`${auction.cardName} เกรด ${auction.grade}`}
                transformWidth={900}
                priority
                wrapperClassName="absolute top-1/2 left-1/2 h-[78%] w-auto -translate-x-1/2 -translate-y-1/2 rounded-xl border-4 border-white/10 shadow-2xl"
                className="object-cover"
              />

              <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 rounded-full bg-gradient-ember px-3 py-1.5 text-xs font-bold text-primary-foreground shadow-glow">
                <Radio className="h-3.5 w-3.5" />
                กำลังประมูล
              </span>
              <span className="absolute top-4 right-4 rounded-full border border-accent/50 bg-background/70 px-3 py-1.5 font-display text-xs font-bold text-accent">
                {auction.grade}
              </span>
              <span className="absolute bottom-4 left-4 rounded-full bg-background/70 px-3 py-1 text-xs font-semibold backdrop-blur">
                {shot + 1}/{gallery.length}
              </span>

              <button
                onClick={() => setShot((s) => (s - 1 + gallery.length) % gallery.length)}
                aria-label="รูปก่อนหน้า"
                className="absolute top-1/2 left-4 flex min-h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition-colors hover:bg-secondary"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShot((s) => (s + 1) % gallery.length)}
                aria-label="รูปถัดไป"
                className="absolute top-1/2 right-4 flex min-h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur transition-colors hover:bg-secondary"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </section>

          {/* Dashboard */}
          <section className="space-y-4">
            <div className="rounded-3xl bg-gradient-ember p-5 text-primary-foreground shadow-glow">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Timer className="h-4 w-4" />
                เหลือเวลา
              </p>
              <div className="mt-2 flex items-end gap-3 tabular-nums">
                {time.map((p, i) => (
                  <div key={p.l} className="flex items-end gap-3">
                    {i > 0 && (
                      <span className="pb-2 font-display text-3xl font-bold opacity-70">:</span>
                    )}
                    <div className="text-center">
                      <div className="font-display text-4xl leading-none font-extrabold sm:text-5xl">
                        {p.v}
                      </div>
                      <div className="mt-1 text-[11px] opacity-90">{p.l}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {urgent && (
              <p className="flex items-center justify-center gap-2 rounded-2xl border border-primary/40 bg-primary/10 px-4 py-2.5 text-sm font-medium text-primary">
                <Bell className="h-4 w-4" />
                ใกล้ปิดประมูล ระบบจะแจ้งเตือนให้คุณ
              </p>
            )}

            <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-5">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" />
                ราคาปัจจุบัน
              </p>
              <p className="mt-1 font-display text-4xl font-extrabold text-primary sm:text-5xl">
                {thb.format(auction.currentBid)}
              </p>

              <button
                onClick={() => toast(`มีการเสนอราคาแล้ว ${auction.bidCount} ครั้ง`)}
                className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-full border border-primary/40 px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary/10"
              >
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary/20">
                  <Gavel className="h-3 w-3" />
                </span>
                {auction.bidCount} ครั้งที่เสนอ
                <ChevronRight className="h-4 w-4" />
              </button>

              <div className="mt-5 border-t border-dashed border-border pt-4">
                <p className="text-sm text-muted-foreground">เสนอราคาขั้นต่ำครั้งถัดไป</p>
                <p className="font-display text-2xl font-bold">{thb.format(minNext)}</p>
              </div>

              <img
                src={taletailsLogo}
                alt=""
                width={96}
                height={96}
                className="pointer-events-none absolute -right-3 -bottom-3 h-24 w-24 animate-bounce rounded-full object-cover opacity-90 [animation-duration:3.5s]"
              />
            </div>
          </section>
        </div>
      </main>

      {/* Sticky bidding controller */}
      <div className="fixed inset-x-0 bottom-[calc(64px+max(0.75rem,env(safe-area-inset-bottom)))] z-40 px-4 lg:bottom-0 lg:border-t lg:border-border lg:bg-card/95 lg:px-0 lg:backdrop-blur">
        <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-card/95 px-3 py-3 shadow-lg backdrop-blur sm:px-6 lg:rounded-none lg:border-0 lg:bg-transparent lg:px-8 lg:shadow-none">

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <Input
                type="number"
                aria-label="จำนวนเงินที่ต้องการเสนอ"
                value={bid}
                min={minNext}
                step={50}
                onChange={(e) => setBid(Number(e.target.value))}
                className="min-h-11 min-w-0 flex-1 rounded-xl text-base font-semibold"
              />
              <Button
                variant="secondary"
                className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold"
                onClick={() => setBid((b: number) => b + 1000)}
              >
                +฿1,000
              </Button>
              <Button
                variant="secondary"
                className="min-h-11 shrink-0 rounded-xl px-3 text-xs font-semibold"
                onClick={() => setBid((b: number) => b + 5000)}
              >
                +฿5,000
              </Button>
            </div>
            <ConfirmDialog
              title="ยืนยันการเสนอราคา"
              description={`คุณกำลังเสนอราคา ${thb.format(bid)} การเสนอราคาไม่สามารถยกเลิกได้`}
              confirmLabel="เสนอราคา"
              onConfirm={() => {
                if (!requireAuth("กรุณาเข้าสู่ระบบก่อนเสนอราคา")) return;
                if (bid < minNext) {
                  toast.error(`ต้องเสนออย่างน้อย ${thb.format(minNext)}`);
                  return;
                }
                toast.success(`เสนอราคา ${thb.format(bid)} เรียบร้อย`);
              }}
              trigger={
                <Button className="min-h-11 w-full rounded-xl bg-gradient-ember px-6 font-semibold text-primary-foreground shadow-glow hover:opacity-90 sm:w-auto">
                  <Gavel className="h-4 w-4" />
                  ยืนยันเสนอราคา
                </Button>
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
