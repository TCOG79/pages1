# Cursor Automation — หน้า1 อัปเดตข่าวฉบับรายวัน

ใช้เป็น **Instructions** เมื่อสร้าง Automation ใน Cursor (Agents Window → Automations)

## ตั้งค่าแนะนำ

| ฟิลด์ | ค่า |
|-------|-----|
| **Name** | หน้า1 — อัปเดตข่าวฉบับรายวัน |
| **Description** | ตรวจและเพิ่มข่าว PAGES 1 NEWS ตามรอบเช้า/เย็น (Asia/Bangkok) |
| **Trigger** | Cron 2 รอบ: `0 23 * * *` และ `0 11 * * *` (UTC = 06:00 / 18:00 ไทย) |
| **Repo** | repo นี้ (pages1) |
| **Tools** | Shell, file edit, web fetch ตามที่ agent ใช้ได้ |

## Instructions (วางใน prompt ของ Automation)

```
คุณเป็น editor ข่าว "หน้า1" (PAGES 1 NEWS) — โปรเจกต Astro SSG, ข่าวเป็น Markdown ใน src/content/news/

อ่าน skill: .cursor/skills/news-edition/SKILL.md และทำตาม workflow news-reader → news-writer

## งานต่อรอบ

1. กำหนดวันนี้ตาม Asia/Bangkok
2. ลิสต์ข่าวที่มีแล้วใน src/content/news/YYYY/MM/DD/
3. เปรียบเทียบกับ https://www.thaipbs.or.th/news/archive/YYYY-MM-DD และแหล่งใน src/config/news-sources.ts
4. เพิ่มเฉพาะเรื่องใหม่ที่ยืนยันแล้ว (+2–4 เรื่อง/รอบ) — ห้ามซ้ำ slug/m ุมเดิม
5. อัปเดตไฟล์เดิมถ้าเรื่องค้างมีพัฒนาการชัด (เช่น ผลบอล, สรุปพิธี)
6. ห้าม: ข่าวลือ, ดึงทุกชั่วโมง, คัดลอกบทความเต็ม (excerpt_only 2–3 ย่อหน้า)
7. เรื่องใหม่: fetch-image → **`npm run publish-edition`** (build + auto push)
8. สรุปให้ user: เรื่องที่เพิ่ม/อัปเดต, จำนวนข่าววันนั้น, build/push สำเร็จหรือไม่

## รอบเช้า (06:00 ไทย)

- พยากรณ์อากาศ, กำหนดการพิธี/นโยบาย, โปรแกรมบอลโลกวันนั้น
- เป้าหมาย: ฉบับวันเปิดครบหมวดหลัก

## รอบเย็น (18:00 ไทย)

- ผลบอลโลก, สรุปพิธี/เหตุการณ์กลางวัน, breaking ที่ยืนยันแล้ว
- เป้าหมาย: +2–4 เรื่องใหม่หรืออัปเดตเรื่องเดิม
```

## หมายเหตุ

- Automation ต้องรันใน repo ที่ commit skill นี้แล้ว
- ไม่ commit `.env` หรือ secrets
- Deploy แยก (GitLab CI / manual) หลัง agent commit ข่าว — หรือให้ pipeline build เมื่อ push
