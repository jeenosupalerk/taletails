export type AuctionDbStatus = "active" | "ended" | "waiting_payment" | "passed_to_next";
export type CardDbStatus = "available" | "locked" | "sold";

export type AuctionOutcome = "live" | "waiting_payment" | "completed" | "failed";

export interface AuctionOutcomeInfo {
  outcome: AuctionOutcome;
  label: string;
  /** Extra hint shown under the label. */
  hint?: string;
  tone: "live" | "warning" | "success" | "muted";
}

/**
 * สถานะการประมูลที่ผู้ใช้เห็น โดยอ้างอิงสถานะรอบประมูลร่วมกับสถานะการ์ด
 * (การ์ดจะเป็น "sold" เฉพาะเมื่อผู้ชนะชำระเงินสำเร็จแล้ว)
 */
export function getAuctionOutcome(
  auctionStatus: AuctionDbStatus,
  cardStatus: CardDbStatus,
  endTime?: string,
): AuctionOutcomeInfo {
  const timeUp = endTime ? new Date(endTime).getTime() <= Date.now() : false;

  if (auctionStatus === "active" && !timeUp) {
    return { outcome: "live", label: "กำลังประมูล", tone: "live" };
  }

  if (cardStatus === "sold") {
    return {
      outcome: "completed",
      label: "ประมูลสำเร็จ",
      hint: "ผู้ชนะชำระเงินแล้ว",
      tone: "success",
    };
  }

  if (auctionStatus === "waiting_payment" || auctionStatus === "passed_to_next") {
    return {
      outcome: "waiting_payment",
      label: "รอชำระเงิน",
      hint: "รอผู้ชนะชำระเงินตามเวลาที่กำหนด",
      tone: "warning",
    };
  }

  if (auctionStatus === "active" && timeUp) {
    return {
      outcome: "waiting_payment",
      label: "รอชำระเงิน",
      hint: "ปิดประมูลแล้ว กำลังสรุปผลผู้ชนะ",
      tone: "warning",
    };
  }

  return {
    outcome: "failed",
    label: "รอเปิดประมูลใหม่",
    hint: "ประมูลไม่สำเร็จ แอดมินจะเปิดประมูลการ์ดใบนี้อีกครั้ง",
    tone: "muted",
  };
}

/** ชิปสถานะแบบทึบ อ่านง่ายบนรูปภาพ */
export const AUCTION_OUTCOME_TONE_CLASS: Record<AuctionOutcomeInfo["tone"], string> = {
  live: "border-transparent bg-primary text-primary-foreground",
  warning: "border-transparent bg-amber-500 text-white",
  success: "border-transparent bg-emerald-600 text-white",
  muted: "border-transparent bg-foreground/80 text-background",
};

/** จุดนำหน้าในชิปสถานะ */
export const AUCTION_OUTCOME_DOT_CLASS: Record<AuctionOutcomeInfo["tone"], string> = {
  live: "bg-primary-foreground animate-pulse",
  warning: "bg-white",
  success: "bg-white",
  muted: "bg-background",
};
