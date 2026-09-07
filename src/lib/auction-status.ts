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
    return { outcome: "live", label: "กำลังเปิดประมูล", tone: "live" };
  }

  if (cardStatus === "sold") {
    return {
      outcome: "completed",
      label: "การประมูลเสร็จสมบูรณ์",
      hint: "ผู้ชนะชำระเงินเรียบร้อยแล้ว",
      tone: "success",
    };
  }

  if (auctionStatus === "waiting_payment" || auctionStatus === "passed_to_next") {
    return {
      outcome: "waiting_payment",
      label: "รอผู้ชนะชำระเงิน",
      hint: "ระบบกำลังรอการชำระเงินจากผู้ชนะภายในเวลาที่กำหนด",
      tone: "warning",
    };
  }

  if (auctionStatus === "active" && timeUp) {
    return {
      outcome: "waiting_payment",
      label: "รอผู้ชนะชำระเงิน",
      hint: "ปิดประมูลแล้ว ระบบกำลังสรุปผลผู้ชนะ",
      tone: "warning",
    };
  }

  return {
    outcome: "failed",
    label: "การประมูลไม่เป็นผล กำลังจะเริ่มประมูลใหม่",
    hint: "รอผู้ดูแลระบบกดเปิดประมูลใหม่ การ์ดใบนี้จะกลับมาประมูลอีกครั้ง",
    tone: "muted",
  };
}

export const AUCTION_OUTCOME_TONE_CLASS: Record<AuctionOutcomeInfo["tone"], string> = {
  live: "border-primary/40 bg-primary/10 text-primary",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  muted: "border-border bg-muted text-muted-foreground",
};
