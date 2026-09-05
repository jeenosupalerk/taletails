import card1 from "@/assets/card-1.jpg";
import card2 from "@/assets/card-2.jpg";
import card3 from "@/assets/card-3.jpg";
import card4 from "@/assets/card-4.jpg";
import card5 from "@/assets/card-5.jpg";
import card6 from "@/assets/card-6.jpg";

export interface ProductReview {
  id: string;
  rating: number;
  timeAgo: string;
  condition: string;
  comment: string;
}

export interface Product {
  id: string;
  cardName: string;
  setName: string;
  conditionTag: string;
  price: number;
  imageUrl: string;
  images: string[];
  cardIdCode: string;
  isVerified: boolean;
  storeName: string;
  /* รายละเอียดการ์ด */
  cardNo: string;
  language: string;
  rarity: string;
  year: number;
  grade: string;
  gradingCompany: string;
  certificationNo: string;
  conditionNote: string;
  sellerNote: string;
  /* ตัวเลขประกอบ */
  lastSalePrice: number;
  highestBid: number | null;
  soldCount: number;
  rating: number;
  reviews: ProductReview[];
  /** สถานะการ์ดจริงจากฐานข้อมูล (ถ้ามี) */
  status?: "available" | "locked" | "sold";
}

const baseReviews: ProductReview[] = [
  {
    id: "rv-1",
    rating: 5,
    timeAgo: "5 วันก่อน",
    condition: "สภาพ • ตรงตามเกรด",
    comment: "การ์ดสวยมาก แพ็กมาแน่นหนา ส่งไว",
  },
  {
    id: "rv-2",
    rating: 5,
    timeAgo: "1 สัปดาห์ก่อน",
    condition: "สภาพ • ตรงตามเกรด",
    comment: "เคสไม่มีรอย ตรงปกตามรูปเลยครับ",
  },
];

export const products: Product[] = [
  {
    id: "prd-2001",
    cardName: "Emberfox Holo #04",
    setName: "Base Set 1999",
    conditionTag: "Near Mint",
    price: 8990,
    imageUrl: card1,
    images: [card1, card2, card4, card5],
    cardIdCode: "CRD-1999-00010422",
    isVerified: true,
    storeName: "Denhouse Cards",
    cardNo: "004/102",
    language: "อังกฤษ (EN)",
    rarity: "Holo Rare",
    year: 1999,
    grade: "PSA 10",
    gradingCompany: "PSA",
    certificationNo: "PSA-88104223",
    conditionNote: "มุมคมทั้ง 4 ด้าน ผิวการ์ดไม่มีรอยขีดข่วน กึ่งกลางภาพ 55/45",
    sellerNote:
      "การ์ดเก็บในตู้ควบคุมความชื้นตลอด ส่งพร้อมกล่องกันกระแทกและประกันการขนส่งเต็มมูลค่า",
    lastSalePrice: 8750,
    highestBid: 8600,
    soldCount: 12,
    rating: 5,
    reviews: baseReviews,
  },
  {
    id: "prd-2002",
    cardName: "Voltbrand Prime",
    setName: "Neo Genesis",
    conditionTag: "Mint",
    price: 2450,
    imageUrl: card2,
    images: [card2, card3, card6],
    cardIdCode: "CRD-2001-00048117",
    isVerified: true,
    storeName: "Kitsune Collectibles",
    cardNo: "017/111",
    language: "ญี่ปุ่น (JP)",
    rarity: "Prime",
    year: 2001,
    grade: "PSA 9",
    gradingCompany: "PSA",
    certificationNo: "PSA-77410912",
    conditionNote: "ขอบด้านล่างมีรอยขาวจางมาก มองเห็นเมื่อส่องไฟ",
    sellerNote: "การ์ดแท้ 100% ตรวจสอบรหัสได้จากเว็บไซต์ผู้ให้เกรด",
    lastSalePrice: 2380,
    highestBid: null,
    soldCount: 34,
    rating: 4.8,
    reviews: baseReviews,
  },
  {
    id: "prd-2003",
    cardName: "Verdant Bloom",
    setName: "Jungle Reprint",
    conditionTag: "Lightly Played",
    price: 310,
    imageUrl: card3,
    images: [card3, card1, card5],
    cardIdCode: "CRD-2004-00072908",
    isVerified: false,
    storeName: "Northwind Trades",
    cardNo: "045/064",
    language: "อังกฤษ (EN)",
    rarity: "Rare",
    year: 2004,
    grade: "Raw (ไม่ได้จัดเกรด)",
    gradingCompany: "—",
    certificationNo: "—",
    conditionNote: "มีรอยขาวที่ขอบเล็กน้อย ผิวหน้าการ์ดยังเงาดี",
    sellerNote: "เหมาะสำหรับนักสะสมที่ต้องการต้นทุนต่ำ ส่งในซองแข็งกันน้ำ",
    lastSalePrice: 295,
    highestBid: 280,
    soldCount: 88,
    rating: 4.6,
    reviews: baseReviews,
  },
  {
    id: "prd-2004",
    cardName: "Aurum Rainbow Rare",
    setName: "Golden Vault",
    conditionTag: "Mint",
    price: 3620,
    imageUrl: card4,
    images: [card4, card6, card2],
    cardIdCode: "CRD-2021-00119043",
    isVerified: true,
    storeName: "Vault Nine",
    cardNo: "188/172",
    language: "อังกฤษ (EN)",
    rarity: "Rainbow Rare",
    year: 2021,
    grade: "BGS 9.5",
    gradingCompany: "BGS",
    certificationNo: "BGS-0014839221",
    conditionNote: "Subgrade ต่ำสุด 9 ที่มุมขวาล่าง นอกนั้น 9.5 ขึ้นไป",
    sellerNote: "พร้อมส่งทันที มีวิดีโอตอนแพ็กสินค้าให้ทุกออเดอร์",
    lastSalePrice: 3550,
    highestBid: 3400,
    soldCount: 21,
    rating: 5,
    reviews: baseReviews,
  },
  {
    id: "prd-2005",
    cardName: "Nebula Sovereign",
    setName: "Cosmic Eclipse",
    conditionTag: "Near Mint",
    price: 1780,
    imageUrl: card5,
    images: [card5, card4, card1],
    cardIdCode: "CRD-2019-00090551",
    isVerified: true,
    storeName: "Den Mother TCG",
    cardNo: "205/236",
    language: "อังกฤษ (EN)",
    rarity: "Secret Rare",
    year: 2019,
    grade: "PSA 9",
    gradingCompany: "PSA",
    certificationNo: "PSA-66123980",
    conditionNote: "ผิวการ์ดสะอาด มีรอยพิมพ์จากโรงงานเล็กน้อยที่ขอบขวา",
    sellerNote: "ราคานี้รวมค่าจัดส่งแบบลงทะเบียนพร้อมประกันแล้ว",
    lastSalePrice: 1720,
    highestBid: 1650,
    soldCount: 40,
    rating: 4.9,
    reviews: baseReviews,
  },
  {
    id: "prd-2006",
    cardName: "Silver Tide Etch",
    setName: "Tidal Forge",
    conditionTag: "Near Mint",
    price: 940,
    imageUrl: card6,
    images: [card6, card3, card2],
    cardIdCode: "CRD-2016-00063720",
    isVerified: false,
    storeName: "Ashgrove Cards",
    cardNo: "077/149",
    language: "ญี่ปุ่น (JP)",
    rarity: "Ultra Rare",
    year: 2016,
    grade: "Raw (ไม่ได้จัดเกรด)",
    gradingCompany: "—",
    certificationNo: "—",
    conditionNote: "สภาพใกล้ใหม่ ไม่มีรอยพับ มีฝุ่นบางที่ขอบซองเดิม",
    sellerNote: "ส่งจากกรุงเทพฯ ภายใน 1 วันทำการ ทักแชทขอรูปเพิ่มได้",
    lastSalePrice: 910,
    highestBid: null,
    soldCount: 15,
    rating: 4.7,
    reviews: baseReviews,
  },
];

export const getFeaturedProducts = (): Product[] => products;

export const getProductById = (id: string): Product | undefined =>
  products.find((product) => product.id === id);

export const getRelatedProducts = (id: string, limit = 4): Product[] =>
  products.filter((product) => product.id !== id).slice(0, limit);
