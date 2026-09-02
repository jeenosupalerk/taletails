import { Link } from "@tanstack/react-router";
import { Gavel, Radio } from "lucide-react";

import { CountdownBadge } from "@/components/site/CountdownBadge";
import { SectionHeading } from "@/components/site/SectionHeading";
import { Button } from "@/components/ui/button";
import { getLiveAuctions, type Auction } from "@/data/auctions";

const currency = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function AuctionCard({ auction }: { auction: Auction }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-border bg-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-glow">
      <div className="relative aspect-[4/5] overflow-hidden bg-gradient-vault">
        <img
          src={auction.imageUrl}
          alt={`${auction.cardName} — ${auction.grade}`}
          width={768}
          height={1024}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-ember px-2.5 py-1 text-xs font-bold text-primary-foreground">
            <Radio className="h-3.5 w-3.5" />
            {auction.status === "ending-soon" ? "ใกล้ปิด" : "กำลังประมูล"}
          </span>
        </div>
        <span className="absolute top-3 right-3 rounded-full border border-accent/40 bg-background/85 px-2.5 py-1 font-display text-xs font-bold text-accent">
          {auction.grade}
        </span>
        <div className="absolute right-3 bottom-3 left-3">
          <CountdownBadge endTime={auction.endTime} className="w-full justify-center" />
        </div>
      </div>

      <div className="p-4">
        <h3 className="truncate font-display text-base font-semibold">
          <Link to="/auction/$id" params={{ id: auction.id }} className="hover:text-primary">
            {auction.cardName}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{auction.setName}</p>

        <div className="mt-4 flex items-end justify-between">
          <div>
            <p className="text-[11px] tracking-wide text-muted-foreground">ราคาปัจจุบัน</p>
            <p className="font-display text-xl font-bold text-primary">
              {currency.format(auction.currentBid)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">{auction.bidCount} ครั้งที่เสนอ</p>
            <p className="text-[11px] text-muted-foreground">
              เริ่มที่ {currency.format(auction.startingPrice)}
            </p>
          </div>
        </div>

        <Button
          asChild
          className="mt-4 h-11 w-full rounded-xl bg-gradient-ember font-semibold text-primary-foreground shadow-glow hover:opacity-90"
        >
          <Link to="/auctions" search={{ id: auction.id }}>
            <Gavel className="h-4 w-4" />
            เสนอราคา
          </Link>
        </Button>
      </div>
    </article>
  );
}

export function LiveAuctions({ showHeading = true }: { showHeading?: boolean }) {
  const liveAuctions = getLiveAuctions();

  return (
    <section id="auctions" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {showHeading && (
        <SectionHeading
          eyebrow={
            <>
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-destructive" />
              กำลังประมูล
            </>
          }
          title="ประมูล"
          description="ทุกรายการผ่านการตรวจสอบและเก็บในห้องนิรภัยก่อนเคาะไม้"
          actionLabel="ดูการประมูลทั้งหมด"
          actionTo="/auctions"
        />
      )}
      {!showHeading && <h2 className="sr-only">รายการประมูลที่กำลังเปิด</h2>}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {liveAuctions.map((auction) => (
          <AuctionCard key={auction.id} auction={auction} />
        ))}
      </div>
    </section>
  );
}
