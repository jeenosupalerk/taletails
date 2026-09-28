import type { AdminCardRow } from "@/hooks/useAdmin";
import { isSoldExpiredFromMarket } from "@/hooks/useSupabaseCatalog";
import { getAuctionOutcome, type AuctionDbStatus, type CardDbStatus } from "@/lib/auction-status";

/** กลุ่มสถานะที่ผู้ขายใช้กรองรายการ (ชิปด้านบน) */
export type ListingBucket = "selling" | "auction" | "payment" | "sold" | "draft";

export const BUCKETS: { key: ListingBucket | "all"; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "selling", label: "ขายอยู่" },
  { key: "auction", label: "ประมูล" },
  { key: "payment", label: "รอชำระ" },
  { key: "sold", label: "ขายแล้ว" },
  { key: "draft", label: "ร่าง / ซ่อน" },
];

export type BadgeTone = "live" | "wait" | "ok" | "muted" | "danger";

export interface ListingState {
  bucket: ListingBucket;
  badge: { label: string; tone: BadgeTone };
  auction: NonNullable<AdminCardRow["auctions"]>[number] | undefined;
  /** รอบประมูลที่เปิดอยู่ (รวมที่ตั้งเวลาเริ่มไว้) */
  activeAuction: boolean;
  scheduled: boolean;
  /** ลูกค้ากำลังชำระ ยังไม่หมดเวลา */
  paymentInProgress: boolean;
  /** ผู้ชนะไม่จ่ายตามเวลา → เปิดประมูลใหม่ได้ */
  paymentOverdue: boolean;
  /** ลูกค้าจ่ายแล้ว รอจัดส่ง */
  toShip: number;
  /** รอบประมูลสำเร็จ / รอชำระ → ห้ามแก้ไข */
  managementLocked: boolean;
  lockedNote: string;
  isDraftAuction: boolean;
  expiredFromMarket: boolean;
  lowStock: boolean;
  /** เหตุผลที่ลบไม่ได้ (ตรงกับ admin_delete_card) — null = ลบได้ */
  deleteBlockedNote: string | null;
  /** ซ่อน/แสดงในร้านได้ไหม */
  canTogglePublish: boolean;
}

/** รวมกติกาทั้งหมดของแถวสินค้าไว้ที่เดียว — ตัวกรอง, ป้ายสถานะ, ปุ่มหลัก และเมนู ⋯ ใช้ค่าชุดเดียวกัน */
export function listingState(c: AdminCardRow, now: number): ListingState {
  const auction = c.auctions?.[0];
  const orders = c.orders ?? [];
  const outcome = auction
    ? getAuctionOutcome(
        auction.status as AuctionDbStatus,
        c.status as CardDbStatus,
        auction.end_time,
        Number(auction.bid_count ?? 0),
      )
    : null;

  const overdueOrder = orders.some(
    (o) => o.status === "pending" && new Date(o.payment_due_at).getTime() <= now,
  );
  const paymentInProgress = orders.some(
    (o) => o.status === "pending" && new Date(o.payment_due_at).getTime() > now,
  );
  const toShip = orders.filter((o) => o.status === "paid").length;
  const hasLiveOrder = orders.some((o) => o.status !== "cancelled");
  const activeAuction = (c.auctions ?? []).some((a) => a.status === "active");
  const activeWithBids = (c.auctions ?? []).some(
    (a) => a.status === "active" && Number(a.bid_count ?? 0) > 0,
  );
  const scheduled =
    !!auction &&
    auction.status === "active" &&
    !!auction.start_time &&
    new Date(auction.start_time).getTime() > now;

  const paymentOverdue =
    c.status !== "sold" &&
    outcome?.outcome === "waiting_payment" &&
    (overdueOrder || orders.every((o) => o.status === "cancelled"));

  const managementLocked =
    c.status === "sold" ||
    (!paymentOverdue &&
      ((outcome
        ? outcome.outcome === "waiting_payment" || outcome.outcome === "completed"
        : false) ||
        (!!auction && c.status === "locked")));
  const lockedNote =
    c.sale_type === "fixed_price"
      ? "ขายหมดแล้ว เติมสต็อกเพื่อขายต่อได้เลย"
      : c.status === "sold" || outcome?.outcome === "completed"
        ? "ประมูลสำเร็จแล้ว แก้ไขหรือเปิดรอบใหม่ไม่ได้"
        : "รอผู้ชนะชำระเงิน แก้ไขหรือเปิดรอบใหม่ไม่ได้";

  const isDraftAuction = c.sale_type === "auction" && !auction && !c.is_published;
  const expiredFromMarket =
    c.sale_type === "fixed_price" &&
    c.is_published &&
    isSoldExpiredFromMarket(c.status, c.updated_at);
  const stock = c.stock_quantity;
  const lowStock =
    c.sale_type === "fixed_price" &&
    c.status === "available" &&
    stock !== null &&
    stock > 0 &&
    stock <= 2;

  const deleteBlockedNote = paymentInProgress
    ? "ลูกค้ากำลังชำระเงิน ยังลบไม่ได้"
    : hasLiveOrder
      ? "มีคำสั่งซื้อแล้ว ลบไม่ได้ (ใช้ซ่อนแทน)"
      : activeWithBids
        ? "มีคนเสนอราคาแล้ว ลบไม่ได้"
        : null;

  const canTogglePublish =
    c.sale_type === "fixed_price" || (!isDraftAuction && !activeAuction && !!auction);

  // ---- จัดกลุ่ม + ป้ายสถานะ ----
  let bucket: ListingBucket;
  let badge: ListingState["badge"];
  if (c.sale_type === "auction") {
    if (isDraftAuction) {
      bucket = "draft";
      badge = { label: "ร่าง ยังไม่เปิดประมูล", tone: "muted" };
    } else if (scheduled) {
      bucket = "auction";
      badge = { label: "ตั้งเวลาเปิดไว้", tone: "wait" };
    } else if (outcome?.outcome === "live") {
      bucket = "auction";
      badge = { label: "กำลังประมูล", tone: "live" };
    } else if (paymentOverdue) {
      bucket = "payment";
      badge = { label: "ผู้ชนะไม่ชำระ", tone: "danger" };
    } else if (outcome?.outcome === "waiting_payment") {
      bucket = "payment";
      badge = { label: "รอผู้ชนะชำระ", tone: "wait" };
    } else if (outcome?.outcome === "completed" || c.status === "sold") {
      bucket = "sold";
      badge = { label: toShip > 0 ? "ชำระแล้ว รอจัดส่ง" : "ประมูลสำเร็จ", tone: "ok" };
    } else if (!c.is_published) {
      bucket = "draft";
      badge = { label: "ซ่อนจากร้าน", tone: "muted" };
    } else {
      bucket = "auction";
      badge = { label: outcome?.label ?? "ปิดรอบแล้ว", tone: "muted" };
    }
  } else if (paymentInProgress || c.status === "locked") {
    bucket = "payment";
    badge = { label: "ลูกค้ากำลังชำระ", tone: "wait" };
  } else if (!c.is_published) {
    bucket = "draft";
    badge = { label: "ร่าง / ซ่อนอยู่", tone: "muted" };
  } else if (c.status === "sold" || stock === 0) {
    bucket = "sold";
    badge = {
      label:
        toShip > 0 ? "ชำระแล้ว รอจัดส่ง" : expiredFromMarket ? "ขายหมด (หายจากตลาดแล้ว)" : "ขายหมด",
      tone: toShip > 0 ? "ok" : "muted",
    };
  } else {
    bucket = "selling";
    badge = { label: toShip > 0 ? "ขายอยู่ · มีรอจัดส่ง" : "ขายอยู่", tone: "ok" };
  }

  return {
    bucket,
    badge,
    auction,
    activeAuction,
    scheduled,
    paymentInProgress,
    paymentOverdue,
    toShip,
    managementLocked,
    lockedNote,
    isDraftAuction,
    expiredFromMarket,
    lowStock,
    deleteBlockedNote,
    canTogglePublish,
  };
}
