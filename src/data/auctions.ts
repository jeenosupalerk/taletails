import card1 from "@/assets/card-1.jpg";
import card2 from "@/assets/card-2.jpg";
import card3 from "@/assets/card-3.jpg";
import card4 from "@/assets/card-4.jpg";
import card5 from "@/assets/card-5.jpg";
import card6 from "@/assets/card-6.jpg";

export type AuctionStatus = "live" | "ending-soon" | "upcoming" | "ended";

export interface Auction {
  id: string;
  cardName: string;
  setName: string;
  grade: string;
  imageUrl: string;
  /** รูปสินค้าทั้งหมด — รูปแรกคือรูปหลัก (ตรงกับ imageUrl) */
  images: string[];
  startingPrice: number;
  currentBid: number;
  bidCount: number;
  /** ISO string — countdown target */
  endTime: string;
  status: AuctionStatus;
  /* รายละเอียดการ์ด */
  cardNo: string;
  language: string;
  rarity: string;
  year: number;
  gradingCompany: string;
  certificationNo: string;
  conditionNote: string;
  sellerNote: string;
}

const hoursFromNow = (h: number) => new Date(Date.now() + h * 60 * 60 * 1000).toISOString();

export const auctions: Auction[] = [
  {
    id: "auc-1001",
    cardName: "Emberfox Holo #04",
    setName: "Base Set 1999 · 1st Edition",
    grade: "PSA 10",
    imageUrl: card1,
    images: [card1, card2, card5, card6],
    startingPrice: 4200,
    currentBid: 12450,
    bidCount: 38,
    endTime: hoursFromNow(2.4),
    status: "ending-soon",
    cardNo: "004/102",
    language: "อังกฤษ (EN)",
    rarity: "Holo Rare",
    year: 1999,
    gradingCompany: "PSA",
    certificationNo: "PSA-88104223",
    conditionNote: "มุมคมทั้ง 4 ด้าน ผิวการ์ดไม่มีรอยขีดข่วน กึ่งกลางภาพ 55/45",
    sellerNote: "เก็บในตู้ควบคุมความชื้นตลอด ส่งพร้อมกล่องกันกระแทกและประกันการขนส่งเต็มมูลค่า",
  },
  {
    id: "auc-1002",
    cardName: "Voltbrand Prime",
    setName: "Neo Genesis · Unlimited",
    grade: "BGS 9.5",
    imageUrl: card2,
    images: [card2, card3, card1, card4],
    startingPrice: 900,
    currentBid: 3180,
    bidCount: 21,
    endTime: hoursFromNow(9),
    status: "live",
    cardNo: "017/111",
    language: "ญี่ปุ่น (JP)",
    rarity: "Prime",
    year: 2001,
    gradingCompany: "BGS",
    certificationNo: "BGS-0014772013",
    conditionNote: "ขอบด้านล่างมีรอยขาวจางมาก มองเห็นเมื่อส่องไฟ",
    sellerNote: "การ์ดแท้ 100% ตรวจสอบรหัสได้จากเว็บไซต์ผู้ให้เกรด",
  },
  {
    id: "auc-1003",
    cardName: "Aurum Rainbow Rare",
    setName: "Golden Vault · Secret",
    grade: "CGC 9",
    imageUrl: card4,
    images: [card4, card6, card2, card5],
    startingPrice: 1500,
    currentBid: 2740,
    bidCount: 14,
    endTime: hoursFromNow(27),
    status: "live",
    cardNo: "188/172",
    language: "อังกฤษ (EN)",
    rarity: "Rainbow Rare",
    year: 2021,
    gradingCompany: "CGC",
    certificationNo: "CGC-4471902",
    conditionNote: "Subgrade ต่ำสุด 9 ที่มุมขวาล่าง นอกนั้น 9.5 ขึ้นไป",
    sellerNote: "พร้อมส่งทันที มีวิดีโอตอนแพ็กสินค้าให้ทุกออเดอร์",
  },
  {
    id: "auc-1004",
    cardName: "Nebula Sovereign",
    setName: "Cosmic Eclipse · Alt Art",
    grade: "PSA 9",
    imageUrl: card5,
    images: [card5, card1, card3, card6],
    startingPrice: 620,
    currentBid: 1895,
    bidCount: 9,
    endTime: hoursFromNow(51),
    status: "live",
    cardNo: "205/236",
    language: "อังกฤษ (EN)",
    rarity: "Secret Rare",
    year: 2019,
    gradingCompany: "PSA",
    certificationNo: "PSA-66123980",
    conditionNote: "ผิวการ์ดสะอาด มีรอยพิมพ์จากโรงงานเล็กน้อยที่ขอบขวา",
    sellerNote: "ราคานี้รวมค่าจัดส่งแบบลงทะเบียนพร้อมประกันแล้ว",
  },
];

export const getLiveAuctions = (): Auction[] =>
  auctions.filter((a) => a.status === "live" || a.status === "ending-soon");

export const getAuctionById = (id: string): Auction | undefined =>
  auctions.find((a) => a.id === id);
