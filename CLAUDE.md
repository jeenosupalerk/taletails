# taletails-trade.com — บริบทสำหรับ Claude Code

ไฟล์นี้วางไว้ที่ **root ของ repo** (`taletails/CLAUDE.md`) — Claude Code จะอ่านอัตโนมัติทุกครั้งที่เปิดในโฟลเดอร์นี้ อัปเดตล่าสุด: 23 ก.ย. 2026

---

## 1\. โปรเจกต์นี้คืออะไร

เว็บซื้อขาย/ประมูลการ์ดสะสมของไทย **taletails-trade.com** เจ้าของคือ Jeeno (UX/UI Designer ไม่ใช่สายเขียนโค้ด) — **ตอบเป็นภาษาไทย เรียกว่า "พี่" อธิบายสั้น ตรงประเด็น ไม่ต้องใส่ศัพท์เทคนิคเกินจำเป็น**

| ส่วน | ใช้อะไร |
| :---- | :---- |
| Frontend | TanStack Start \+ TanStack Router (ไม่ใช่ React Router), React 19, React Query, Tailwind v4, supabase-js |
| ที่มาของโค้ด | เขียนใน Lovable.ai → sync กับ GitHub repo `jeenosupalerk/taletails` (**repo นี้เป็น public**) |
| Backend | Supabase project ref `biuyjlrovmcpyqczmaje` |
| Hosting | Hostatom / Plesk |

คำสั่งที่ใช้บ่อย: `npm install` · `npm run dev` · `npm run build` · `npm run lint`

---

## 2\. กติกาที่ห้ามข้าม

1. **ห้ามแก้โครงสร้างหรือข้อมูลใน Supabase ก่อนได้รับคำยืนยันจากเจ้าของ** — เขียน SQL ใส่ไฟล์ไว้ก่อน อธิบายว่าจะเปลี่ยนอะไร ทำไฟล์ ROLLBACK คู่กันเสมอ แล้วรอ "โอเค apply ได้" ค่อยรัน (อ่านอย่างเดียว/query ดูข้อมูล ทำได้เลย)  
2. **repo เป็น public — ห้าม commit `.env` หรือคีย์ลับ** (Stripe live key, service role key, VAPID private key, CRON\_SECRET) ถ้าเห็นคีย์หลุดอยู่ในโค้ด ให้แจ้งเจ้าของทันที  
3. **ห้ามลบไฟล์ใน Supabase Storage อัตโนมัติ** — เจ้าของเลือกไว้ว่า "ปล่อยรูปเก่าค้างไว้ก่อน" ถ้าจะล้างต้องทำเป็นปุ่มในหลังบ้านที่ตรวจก่อนว่าไม่มีใครใช้ แล้วให้เจ้าของกดเอง  
4. **อย่า force push / rebase / amend commit ที่ push ไปแล้ว** — repo ผูกกับ Lovable ประวัติจะพัง (ดู `AGENTS.md`)  
5. **ทำ mockup ให้ดูก่อนลงมือโค้ด** สำหรับงานที่เปลี่ยนหน้าตา — เจ้าของเป็นดีไซเนอร์ ชอบเห็นภาพก่อนตัดสินใจ  
6. เจอข้อมูลใหม่ที่ยืนยันแล้ว → เขียนลง `docs/00-START-HERE.md` ทันที อย่าปล่อยให้อยู่แค่ในแชท

---

## 3\. กติกาการเขียนโค้ดในโปรเจกต์นี้

- `tsconfig` เปิด `strict` \+ **`exactOptionalPropertyTypes: true`** → prop ที่ optional ต้องประกาศเป็น `foo?: string | undefined` ไม่ใช่ `foo?: string` และเวลาส่งค่า optional ให้ใช้ spread แบบมีเงื่อนไข `...(x ? { x } : {})`  
- คอมเมนต์อธิบาย "ทำไม" เป็นภาษาไทย (โค้ดเดิมทั้งโปรเจกต์เป็นแบบนี้) ชื่อตัวแปร/ฟังก์ชันเป็นอังกฤษ  
- ข้อความ UI ทุกอย่างเป็นภาษาไทย ราคาใช้ `formatThb`/`thb` ที่มีอยู่แล้ว  
- สไตล์: Tailwind v4 \+ ตัวแปรสีใน `src/styles.css` (`--ember`, `--tile`, `--cd-*`) — ใช้ token ที่มี อย่า hardcode สีใหม่ถ้าเลี่ยงได้  
- ปุ่ม/พื้นที่กดบนมือถือขั้นต่ำ 44px (`min-h-11`)  
- ทุก query ที่คุย Supabase อยู่ใน `src/hooks/*` ไม่เขียน query ปนใน component

### ไฟล์แกนที่ควรรู้จักก่อนแก้

| เรื่อง | ไฟล์ |
| :---- | :---- |
| ราคากลาง / จับกลุ่ม "การ์ดรุ่นเดียวกัน" | `src/lib/market-price.ts` (`cardKey`, `normText`, `looseKey`, `splitGrade`, `marketPriceOf`) |
| สถิติตลาด | `src/hooks/useMarketStats.ts`, `src/hooks/useMarketListings.ts` |
| ตารางเทียบราคาข้ามเกรด | `src/components/market/CrossGradeTable.tsx` |
| ลงสินค้า / แก้รูปสินค้า | `src/components/shop/CardListingManager.tsx`, `ImagePicker.tsx`, `ImageCropDialog.tsx`, `EditImagesDialog.tsx` |
| auth \+ โปรไฟล์ \+ รูปโปรไฟล์ | `src/lib/auth.tsx`, `src/components/profile/ProfileIdentity.tsx`, `src/components/site/UserAvatar.tsx` |
| การ์ดสินค้า/ป้ายเกรด/ตัวนับเวลา | `src/components/card/CardBits.tsx`, `src/components/site/FlipCountdown.tsx` |
| ค้นหาทั้งเว็บ (⌘K) | `src/components/site/GlobalSearch.tsx`, `src/hooks/useGlobalSearch.ts` |

---

## 4\. สถานะล่าสุด (23 ก.ย. 2026\) — ทำเสร็จและ apply แล้ว

- ตัวนับเวลาประมูลแบบแผ่นตัวเลขโทนส้ม · ค้นหาทั้งเว็บ ⌘K · การ์ดสินค้าดีไซน์ใหม่ (รูป 5:7 \+ ป้ายเกรด \+ เทียบราคาตลาด \+ สต็อก)  
- อัปโหลดรูปสินค้าพร้อมครอบ/หมุน/เรียงลำดับ (`react-easy-crop`) และแก้รูปของสินค้าที่ลงไปแล้ว  
- ราคากลาง \= เฉลี่ย 3 ครั้งล่าสุดใน 90 วัน จับกลุ่มตาม ชื่อ \+ ชุด \+ เกรด \+ บริษัทเกรด  
- หน้าสถิติ `/market` (ช่วงเวลา, ตาราง/มือถือ, กราฟเล็ก, ขายล่าสุด) และหน้ารายใบ `/market/$id`  
- **SQC \= บริษัทเกรดของไทย** เป้าหมายร้านคือสร้างราคากลางเกรดไทย → มีแท็บ ทั้งหมด / เกรดไทย (SQC) / ต่างประเทศ / ไม่เกรด และลิงก์ `/market?grade=sqc`  
- ตัวช่วยพิมพ์ชื่อการ์ด/ชุด กันสะกดไม่ตรงกัน  
- ตารางเทียบราคาข้ามเกรดในหน้า `/market/$id` (ฐานเทียบ PSA 10\)  
- รูปโปรไฟล์จาก Google/Facebook \+ อัปโหลดรูปเอง (bucket `avatars`)  
- **SQL ที่ apply ไปแล้ว**: `market_sales` v2 (เพิ่มคอลัมน์ `grading_company`) · trigger `handle_new_user` v3 (เก็บ avatar \+ ชื่อจริง \+ กันชื่อผู้ใช้ชนกัน) · bucket `avatars` \+ policy 4 ข้อ ไฟล์ SQL และ ROLLBACK ทุกตัวอยู่ในโฟลเดอร์ `patches/` ที่เจ้าของเก็บไว้ (ไม่ได้อยู่ใน repo ยกเว้น `supabase/migrations/20260923000000_profile_avatars.sql`)

### ยังไม่ได้ทำ / คิวถัดไปที่เคยคุยกัน

- สถิติเฟส 2: กราฟกระจายราคา, ตัวกรอง, แท็บจัดอันดับ  
- ตั้ง cron บน Hostatom สำหรับอีเมล/push แจ้งเตือน  
- ปุ่มล้างไฟล์รูปเก่าใน storage (ต้องให้เจ้าของกดยืนยันเอง)  
- จัดเลย์เอาต์ฝั่งขวาของหน้า `/card/$id` ใหม่  
- ยังไม่ได้เปิด provider Facebook ใน Supabase (ยังไม่มีใครล็อกอินด้วย Facebook)

---

## 5\. ข้อควรระวังที่เคยเจอมาแล้ว (อย่าพลาดซ้ำ)

- `users.username` เป็น **UNIQUE** → เขียน username กับ avatar แยกคำสั่งกัน ไม่งั้นชื่อชนแล้วรูปไม่ถูกบันทึกไปด้วย  
- `crypto.randomUUID()` ใช้ไม่ได้บน `http://` และ Safari เก่า → ใช้ `uid()` จาก `src/lib/utils.ts`  
- รูปจาก Google (`lh3.googleusercontent.com`) ต้องใส่ `referrerPolicy="no-referrer"` ไม่งั้นบางเครื่องขึ้น 403  
- component `Avatar` ของ shadcn ฝัง `min-h-10` มาด้วย ถ้าย่อให้เล็กกว่า 40px ต้องใส่ `min-h-0`  
- iOS Safari ถอดรหัสรูปใหญ่เกิน \~16MP ไม่ไหว → ย่อรูปก่อนอัปโหลดเสมอ (`compressImageFile`)  
- `orders.total_amount` \= ราคา **ก่อน** หักแต้ม ใช้เป็นราคาขายในสถิติได้เลย  
- bucket `card-images` เป็น private ใช้ signed URL อายุ 10 ปี ส่วน `avatars` เป็น public ใช้ `getPublicUrl`

---

## 6\. ต่อ Supabase ให้ Claude Code

claude mcp add supabase \-t http "https://mcp.supabase.com/mcp?project\_ref=biuyjlrovmcpyqczmaje"

เพิ่ม `&read_only=true` ต่อท้าย URL ถ้าอยากล็อกไว้ให้อ่านอย่างเดียว (ปลอดภัยกว่า แล้วค่อยถอดออกตอนจะ apply migration จริง) ครั้งแรกจะเด้งเบราว์เซอร์ให้ล็อกอิน Supabase — เลือก organization ที่มีโปรเจกต์นี้