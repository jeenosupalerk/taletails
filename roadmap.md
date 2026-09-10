# Roadmap

## Self-hosting on Hostatom / Plesk (Node.js)

- [x] เพิ่มโหมด build สำหรับเซิร์ฟเวอร์ Node ของผู้ใช้ (`vite.config.node.ts`, `bun run build:node`)
- [x] Stripe: ตัดการพึ่งพา Lovable gateway ใช้คีย์ Stripe ของผู้ใช้เอง (ปิดใช้งานไว้ก่อน)
- [x] ตัวตั้งเวลา (cron) ใช้ `CRON_SECRET` ของผู้ใช้เอง
- [x] โดเมนหลักในอีเมล/ลิงก์ = https://taletails-trade.com (`PUBLIC_SITE_URL`)
- [x] เอกสารติดตั้ง `DEPLOY.md` + `.env.example`
- [x] คงหน้า Preview ใน Lovable ให้ใช้งานได้ตามเดิม

## Admin orders และ Push Notification

- [x] รองรับคำสั่งซื้อสถานะรับสินค้าแล้วในหน้าแอดมิน
- [x] ใช้ VAPID Public Key จากเซิร์ฟเวอร์ชุดเดียวกับระบบส่ง Push
- [x] เก็บ Push ที่ส่งล้มเหลวไว้ลองใหม่ และส่งทันทีหลังเปลี่ยนสถานะคำสั่งซื้อ
