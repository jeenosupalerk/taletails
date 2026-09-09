# วิธีนำเว็บขึ้นเซิร์ฟเวอร์ Node.js ของคุณเอง (Hostatom / Plesk)

เว็บนี้ทำงานเป็นแอป Node.js ตัวเดียว (หน้าเว็บ + งานเบื้องหลังอยู่ในตัวเดียวกัน)
ไม่ผูกกับบริการของ Lovable แล้ว ข้อมูลทั้งหมดยังอยู่ที่ Supabase เดิม

## 1. เตรียมเครื่อง

ต้องมี Node.js 20 ขึ้นไป (ใน Plesk เลือกได้จากเมนู Node.js ของโดเมน)

## 2. สร้างไฟล์สำหรับใช้งานจริง

```bash
npm install
npm run build:node
```

จะได้โฟลเดอร์ `.output` ประกอบด้วย

- `.output/server/index.mjs` — ตัวเว็บ (จุดเริ่มต้นของแอป)
- `.output/public/` — รูปภาพและไฟล์หน้าเว็บ

## 3. ตั้งค่า environment

คัดลอก `.env.example` เป็น `.env` แล้วใส่ค่าจริงให้ครบ
(ใน Plesk ใส่ผ่านหน้า Node.js → Custom environment variables ก็ได้)

ค่าที่ต้องมีอย่างน้อย: `PUBLIC_SITE_URL`, `VITE_SUPABASE_URL`,
`VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `RESEND_API_KEY`,
`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`

> ค่า `SUPABASE_SERVICE_ROLE_KEY` เป็นความลับ ห้ามเผยแพร่และห้าม commit ลง GitHub

## 4. เริ่มรัน

```bash
npm start          # เท่ากับ node .output/server/index.mjs
```

ค่าเริ่มต้นจะฟังที่พอร์ต 3000 เปลี่ยนได้ด้วย `PORT=8080`

ใน Plesk: ตั้ง **Application Startup File** = `.output/server/index.mjs`
และ **Document Root** ชี้ไปที่โฟลเดอร์โปรเจกต์ Plesk จะทำ proxy จาก
`https://taletails-trade.com` มายังแอป Node ให้เอง (ไม่ต้องใช้ `.htaccess`
ทำ fallback เพราะทุกเส้นทางถูกจัดการโดยแอป Node)

## 5. ตั้งเวลางานอัตโนมัติ (สำคัญมาก)

ถ้าไม่ตั้ง ระบบจะไม่ปิดประมูลเอง ไม่ยกเลิกรายการที่เลยกำหนดชำระ
และไม่ส่งอีเมล/แจ้งเตือนเด้ง

เพิ่ม cron job ในเซิร์ฟเวอร์ ให้รันทุก 1 นาที (แทน `<CRON_SECRET>` ด้วยค่าจริง)

```bash
* * * * * curl -fsS -H "Authorization: Bearer <CRON_SECRET>" https://taletails-trade.com/api/public/cron/auctions >/dev/null
* * * * * curl -fsS -X POST -H "Authorization: Bearer <CRON_SECRET>" https://taletails-trade.com/api/public/push/dispatch >/dev/null
```

## 6. เปิดรับเงินอัตโนมัติผ่าน Stripe (ตอนนี้ปิดอยู่)

ปัจจุบันลูกค้าโอนตามคิวอาร์โค้ดแล้วแนบสลิป และแอดมินกดยืนยัน — ใช้งานได้ทันที

เมื่อต้องการให้ระบบตัดเงินและยืนยันอัตโนมัติ:

1. ใส่ `STRIPE_SECRET_KEY` จากแดชบอร์ด Stripe ของคุณ
2. สร้าง webhook ใน Stripe ชี้มาที่
   `https://taletails-trade.com/api/public/payments/webhook`
   (เลือกเหตุการณ์ `checkout.session.completed` และ `checkout.session.async_payment_succeeded`)
3. นำรหัสลับของ webhook มาใส่ `STRIPE_WEBHOOK_SECRET`
4. รีสตาร์ทแอป

## 7. เรื่องที่ต้องตั้งค่าฝั่ง Supabase

ใน Supabase → Authentication → URL Configuration
เพิ่ม `https://taletails-trade.com` เป็น Site URL และ Redirect URL
เพื่อให้การเข้าสู่ระบบด้วย Google/Facebook กลับมาที่โดเมนของคุณถูกต้อง
