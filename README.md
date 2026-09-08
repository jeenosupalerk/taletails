# TaleTails Assemble

Source Code: โปรดดึงหน้าเว็บทั้งหมดจาก GitHub ของฉันที่ลิงก์นี้: https://github.com/jeenosupalerk/taletails-test.git เพื่อนำมาสร้างเป็น UI หลักของโปรเจกต์นี้ ห้ามสร้าง UI ใหม่จากศูนย์

Database: 🛑 ห้ามเปิดใช้งาน Lovable Cloud เด็ดขาด! โปรดเชื่อมต่อโปรเจกต์เข้ากับ External Supabase ของฉันโดยตรง ผ่านการตั้งค่า Environment Variables ดังนี้:

VITE_SUPABASE_URL = [https://biuyjlrovmcpyqczmaje.supabase.co](https://biuyjlrovmcpyqczmaje.supabase.co)

VITE_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpdXlqbHJvdm1jcHlxY3ptYWplIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc3MjQ2ODIsImV4cCI6MjEwMzMwMDY4Mn0.M1fq5jxdJOg-5PXbqsK1D5jHFBEjjpDt1ftA7KOecro

Design System & UI Constraints:

ใช้ตัวอักษรตระกูล Prompt และ Kanin ในการจัดการ Typography ทั้งหมด

สำคัญมาก: ควบคุมขนาดของ Input fields, Dropdowns และ Buttons ต่างๆ ให้มีความสูง (Height) อยู่ที่ 40px ถึง 44px เท่านั้น ห้ามตั้งค่าถึง 48px หรือใหญ่กว่านั้น เพื่อป้องกันไม่ให้ UI ดูเทอะทะเกินไปเมื่อแสดงผลบนหน้าจอมือถือ

เป้าหมาย: ประกอบร่างหน้าเว็บจาก GitHub ให้แสดงผลได้อย่างสมบูรณ์ และพร้อมเชื่อมต่อ/ดึงข้อมูลตารางหลัก (users, cards, auctions, bids) จาก Supabase ของฉันทันที

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://taletails.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/385af980-16a1-4082-8f6a-445905c11274).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
