# 01 — Supabase Schema

Backend: Supabase โปรเจกต์ **"taletails Project"** (project ref `biuyjlrovmcpyqczmaje`, region ap-southeast-1, Postgres 17)

> ดึงจากฐานข้อมูลจริงเมื่อ 21 ก.ย. 2026 (เติมคอลัมน์ `cards` และหัวข้อด้านล่างเมื่อ 23 ก.ย.) — ตรงกับของจริง 100% ณ วันที่ดึง ถ้าโครงสร้างเปลี่ยนหลังจากนี้ให้ดึงซ้ำแล้วอัปเดตไฟล์นี้ (ไม่ต้องเดา/จำจากไฟล์นี้อย่างเดียวถ้าห่างจากวันที่ดึงมานาน)

ทุกตารางเปิด **RLS (Row Level Security)** ไว้แล้ว

---

## ภาพรวมความสัมพันธ์

```
auth.users (ของ Supabase Auth)
  └─ users (โปรไฟล์)
       ├─ user_roles        (customer / admin / seller)
       ├─ user_addresses    (ที่อยู่จัดส่ง)
       ├─ notifications
       ├─ push_subscriptions
       ├─ point_transactions
       └─ cards (seller_id) ─┬─ auctions (card_id) ─── bids
                              └─ orders (card_id, auction_id)
                                    └─ auction_penalties
card_listing_history — เก็บ snapshot ประวัติการลงขาย (แยกจาก cards)
articles — บทความ/ข่าวสาร
email_otps — รหัส OTP สำหรับ login/ยืนยันอีเมล
```

---

## `cards` (ตารางสินค้า)

| คอลัมน์ | ประเภท | Nullable | Default | หมายเหตุ |
| :---- | :---- | :---- | :---- | :---- |
| `id` | uuid (PK) | | `gen_random_uuid()` | |
| `seller_id` | uuid (FK → users) | ✅ | | ผู้ขาย |
| `name` | text | | | ชื่อการ์ด |
| `details` | text | ✅ | | รายละเอียด |
| `images` | text[] | | `{}` | array ของ URL รูป |
| `set_name` | text | ✅ | | ชื่อชุด/ซีรีส์ |
| `card_no` | text | ✅ | | หมายเลขการ์ดในชุด |
| `language` | text | ✅ | | ภาษาของการ์ด |
| `rarity` | text | ✅ | | ระดับความหายาก |
| `year` | integer | ✅ | | ปีที่ออก |
| `condition` | text | ✅ | | สภาพการ์ด |
| `grade` | text | ✅ | | เกรด |
| `grading_company` | text | ✅ | | บริษัทตรวจเกรด (เช่น PSA, BGS) |
| `certification_no` | text | ✅ | | เลขใบรับรองเกรด |
| `sale_type` | enum `sale_type` | | `fixed_price` | `auction` \| `fixed_price` |
| `price` | numeric | | `0` | |
| `status` | enum `card_status` | | `available` | `available` \| `locked` \| `sold` |
| `stock_quantity` | integer | ✅ | | จำนวนสต็อก (เฉพาะ fixed_price; ประมูล = null) — เพิ่มเมื่อ 21 ก.ย. |
| `is_published` | boolean | | `true` | false = ฉบับร่าง/ซ่อนจากตลาด — เพิ่มเมื่อ 21 ก.ย. |
| `locked_by` | uuid (FK → users) | ✅ | | ใครกำลังจอง/checkout อยู่ |
| `locked_at` | timestamptz | ✅ | | |
| `created_at` / `updated_at` | timestamptz | | `now()` | |

**หมายเหตุสำคัญ**: `condition` และ `grade` เป็นคนละคอลัมน์จริง ๆ (ไม่ใช่ฟิลด์เดียวกันตามที่เคยสงสัยไว้) — `grade` คือเกรดจากบริษัทตรวจสอบ (ผูกกับ `grading_company`/`certification_no`), `condition` เป็นคำอธิบายสภาพทั่วไป

---

## `card_listing_history`

Snapshot ประวัติการลงขายของแต่ละการ์ด (แยกจาก `cards` — เก็บไว้แม้ `cards` ต้นทางถูกลบ)

| คอลัมน์ | ประเภท | หมายเหตุ |
| :---- | :---- | :---- |
| `id`, `card_id` (unique) | uuid | |
| `seller_id`, `name`, `set_name`, `grade`, `condition`, `image_url` | | copy จากตอนลงขาย |
| `sale_type`, `price`, `final_price` | | ราคาที่ตั้ง / ราคาที่ขายจริง |
| `card_status` (enum `card_status`), `order_status` (enum `order_status`, nullable) | | |
| `sold_at`, `listed_at`, `deleted_at` | timestamptz | |

---

## `auctions`

| คอลัมน์ | ประเภท | หมายเหตุ |
| :---- | :---- | :---- |
| `id`, `card_id` (FK → cards) | uuid | |
| `starting_price`, `current_price` | numeric | default `0` |
| `bid_increment` | numeric | default `50` |
| `bid_count` | integer | default `0` |
| `start_time`, `end_time` | timestamptz | |
| `winner_id` | uuid (FK → users, nullable) | |
| `status` | enum `auction_status` | `active` \| `ended` \| `waiting_payment` \| `passed_to_next` |

## `bids`

`id`, `auction_id` (FK), `user_id` (FK), `amount` (numeric), `created_at`

## `auction_penalties`

ระบบตัดสิทธิ์ผู้ที่ประมูลแล้วไม่จ่าย: `user_id`, `order_id`, `auction_id`, `strike_no`, `level` (text), `banned_until`, `is_permanent`, `reason`, `cleared_at`

---

## `orders`

| คอลัมน์ | ประเภท | หมายเหตุ |
| :---- | :---- | :---- |
| `id`, `user_id` (FK), `card_id` (FK), `auction_id` (FK, nullable) | uuid | |
| `total_amount` | numeric | |
| `payment_method` | enum `payment_method` | `slip` \| `qr_promptpay` \| `stripe_promptpay` |
| `slip_url` | text nullable | |
| `stripe_session_id`, `stripe_payment_intent_id` | text nullable | สำหรับ payment_method = stripe_promptpay |
| `tracking_number` | text nullable | |
| `shipping_name`, `shipping_phone`, `shipping_address` | text nullable | |
| `note` | text nullable | |
| `status` | enum `order_status` | `pending` \| `paid` \| `shipped` \| `cancelled` \| `completed` |
| `paid_at`, `shipped_at`, `received_at` | timestamptz nullable | |
| `payment_due_at` | timestamptz | default `now() + 24h` |
| `points_redeemed` | integer | default `0` |
| `points_discount` | numeric | default `0` |
| `created_at` / `updated_at` | timestamptz | |

---

## `users` (โปรไฟล์ — แยกจาก `auth.users` ของ Supabase Auth)

`id` (FK → `auth.users.id`), `email`, `username` (nullable), `avatar_url` (nullable), `phone` (nullable), `is_banned` (default false), `auction_strikes` (default 0), `auction_banned_until` (nullable), `auction_ban_forever` (default false), `tt_points` (คะแนนสะสม, default 0), `created_at`, `updated_at`

## `user_roles`

`id`, `user_id` (FK), `role` (enum `app_role`: `customer` \| `admin` \| `seller`, default `customer`), `created_at`

> ระบบสิทธิ์แยกตาราง ไม่ใช่คอลัมน์ role บน users โดยตรง — ผู้ใช้คนหนึ่งอาจมีได้หลาย role (เช็คตอนเขียนโค้ดว่า query แบบไหน)

## `user_addresses`

`id`, `user_id` (FK), `label` (default "ที่อยู่จัดส่ง"), `name`, `phone`, `address`, `subdistrict`, `district`, `province`, `postcode`, `is_default`

## `notifications`

`id`, `user_id` (FK), `type` (text, default "system"), `title`, `body` (nullable), `link` (nullable), `email_to` (nullable), `email_sent_at`, `read_at`, `push_sent_at`

## `push_subscriptions`

Web Push subscription: `id`, `user_id` (FK), `endpoint` (unique), `p256dh`, `auth`, `user_agent`

## `point_transactions`

ประวัติแต้มสะสม (`tt_points` ใน users): `id`, `user_id` (FK), `order_id` (FK nullable), `kind` (text), `points` (integer), `amount` (numeric), `description`

## `email_otps`

`id`, `email`, `code_hash`, `purpose` (default "login"), `pending_username` (nullable), `attempts`, `expires_at` (default now()+10min), `consumed_at`

## `articles`

บทความ/ข่าวสาร: `id`, `title`, `category_tag` (default "ข่าวสาร"), `excerpt`, `content`, `thumbnail_url`, `is_published` (default true), `published_at`, `author_id` (FK → users)

---

## ที่ยังไม่ทราบ / ควรเช็กก่อนใช้งานจริง

- รายละเอียด RLS policy ของแต่ละตาราง (รู้แค่ว่าเปิด RLS ไว้ ยังไม่ได้ดึง policy จริงมาดู) — ถ้าจะแก้ policy ให้ตรวจของจริงก่อนเสมอ ไม่เดา
- Function/Trigger ฝั่ง database (เช่น trigger คำนวณ `current_price`/`bid_count` ของ auctions ตอนมี bid ใหม่ — มีความเป็นไปได้สูงว่ามี แต่ยังไม่ได้ตรวจ)

---

## เพิ่มเติม (ตรวจจากของจริง 23 ก.ย. 2026)

### ฟังก์ชัน `market_sales()` (v2)
ข้อมูลการขายจริงสำหรับหน้าสถิติ `/market` — มีคอลัมน์ `grading_company` ตั้งแต่ v2 (22 ก.ย.)

### สิทธิ์อ่าน `auctions` / `bids` (RLS)
- **ยังไม่ล็อกอิน (anon)** อ่าน `auctions` ได้เฉพาะรอบที่ `status = 'active'` — รอบที่ปิดแล้วอ่านไม่ได้
- ล็อกอินแล้วอ่านได้ทุกรอบ, `bids` อ่านได้ทุกคน
- ผลที่ต้องระวังในโค้ด: ผู้เยี่ยมชมเปิดหน้ารอบที่ปิดแล้วจะได้ auction = null (อย่าตีความว่ายังประมูลอยู่)

### Trigger บน `auctions`
- `trg_auctions_updated_at` — อัปเดต updated_at
- `trg_auctions_notify_opened` (23 ก.ย.) — รอบกลายเป็น active → สร้าง notifications `auction_opened` ให้สมาชิกที่มี push_subscriptions (ยกเว้นผู้ขายเองและบัญชีที่ถูกแบน)

### `notifications.type` ที่ใช้จริง
`order`, `auction_outbid`, `auction_won`, `auction_penalty`, `shipping`, `auction_opened`
ทุกแถวที่ `push_sent_at` ว่าง จะถูกส่งเป็น push โดย `dispatchPendingPush` (src/lib/push.server.ts)
