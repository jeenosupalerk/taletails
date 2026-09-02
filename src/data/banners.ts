import banner1 from "@/assets/banner-1.jpg";
import banner2 from "@/assets/banner-2.jpg";
import banner3 from "@/assets/banner-3.jpg";

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  imageUrl: string;
  ctaText: string;
  ctaLink: string;
  isActive: boolean;
}

export const banners: Banner[] = [
  {
    id: "bnr-001",
    title: "ล่าการ์ดในฝัน คว้าใบที่ใช่",
    subtitle: "ประมูลสดการ์ดเกรดที่ตรวจสอบแล้วทุกคืน เวลา 20:00 น. มาเคาะราคาไปพร้อมกัน",
    imageUrl: banner1,
    ctaText: "เข้าสู่ห้องประมูล",
    ctaLink: "/auctions",
    isActive: true,
  },
  {
    id: "bnr-002",
    title: "การ์ดระดับตำนานขึ้นแท่นประมูล",
    subtitle: "ฝากขายคอลเลกชันของคุณ เข้าถึงนักสะสมที่ยืนยันตัวตนกว่า 40,000 คน เดือนนี้ไม่มีค่าลงประกาศ",
    imageUrl: banner2,
    ctaText: "เริ่มฝากขาย",
    ctaLink: "/vault",
    isActive: true,
  },
  {
    id: "bnr-003",
    title: "ทุกใบ ตรวจสอบแท้และเก็บในห้องนิรภัย",
    subtitle: "ผ่านการตรวจสอบจากพันธมิตรผู้เชี่ยวชาญ เก็บในห้องควบคุมอุณหภูมิ และจัดส่งเมื่อคุณสั่ง",
    imageUrl: banner3,
    ctaText: "ห้องนิรภัยทำงานอย่างไร",
    ctaLink: "/vault",
    isActive: true,
  },
];

export const getActiveBanners = (): Banner[] => banners.filter((b) => b.isActive);
