---
name: news-edition
description: อัปเดตข่าวฉบับรายวัน (รอบเช้า/เย็น) สำหรับ PAGES 1 NEWS — ตรวจข่าววันนี้ เพิ่มเรื่องใหม่ อัปเดตเรื่องค้าง. ใช้เมื่อ user ขอรอบข่าว ฉบับเช้า ฉบับเย็น อัปเดตข่าว หรือ automation ตามตาราง
---

# News Edition — PAGES 1 NEWS

## เมื่อไหร่ใช้

- User ขอ "อัปเดตข่าววันนี้" "ฉบับเช้า/เย็น" "รอบข่าว"
- Cursor Automation ตามตาราง (06:00 / 18:00 Asia/Bangkok)
- หลังเหตุการณ์ใหญ่ (บอลโลกจบคู่, พระราชพิธี, breaking news ยืนยันแล้ว)

## ตารางรอบ (Asia/Bangkok)

| รอบ | เวลา | เป้าหมาย |
|-----|------|----------|
| **ฉบับเช้า** | 06:00–08:00 | ข่าว overnight + กำหนดการวัน (อากาศ, พิธี, โปรแกรมกีฬา) |
| **ฉบับเย็น** | 18:00–20:00 | ผลที่เกิดจริง + อัปเดตเรื่องค้าง (+2–4 เรื่อง/รอบ) |

**วันพิเศษ** (บอลโลก, พระราชพิธี): ad-hoc หลังจบเหตุการณ์สำคัญ — ไม่ดึงทุก 1–2 ชม.

## ขั้นตอนแต่ละรอบ

1. อ่านข่าวที่มีแล้วใน `src/content/news/YYYY/MM/DD/*.md` วันนี้
2. เปรียบเทียบกับ [ไทยพีบีเอส archive วันนั้น](https://www.thaipbs.or.th/news/archive/YYYY-MM-DD) และแหล่งใน `src/config/news-sources.ts`
3. **เพิ่มเรื่องใหม่** เมื่อ: เหตุการณ์ใหม่ / หมวดว่าง / กระแสวันนั้นชัด — ใช้ workflow `news-reader → news-summarizer → news-citation → news-writer`
4. **อัปเดตไฟล์เดิม** เมื่อ: เรื่องเดิมมีพัฒนาการ (ไม่สร้าง slug ซ้ำมุมเดิม)
5. **ไม่เพิ่ม** เมื่อ: ข่าวลือ / ซ้ำเรื่องเดิม / รายละเอียดเล็กน้อย
6. `npm run fetch-image` สำหรับเรื่องใหม่
7. **`npm run publish-edition`** — generate-audio (prebuild) → build → **auto commit + push** ไฟล์ข่าว

## Publish ขึ้น Git (อัตโนมัติ)

หลังเพิ่ม/แก้ข่าวสำเร็จ รัน **`npm run publish-edition`** ครั้งเดียว — จะ build แล้ว push เองถ้ามีไฟล์ข่าวเปลี่ยน

```bash
npm run publish-edition           # build + auto push (ค่าเริ่มต้นหลังเพิ่มข่าว)
npm run publish-news -- --dry-run # ดู preview อย่างเดียว
npm run publish-news -- --no-push # commit อย่างเดียว ไม่ push
```

`npm run build` อย่างเดียว **ไม่ push** — ใช้เมื่อ dev/test

## เกณฑ์ครบฉบับ

- ครบ 7 หมวดที่มีข่าวในวันนั้น (ถ้ามีแหล่ง)
- `featured: true` ได้ 1 เรื่องต่อวัน
- ทุกเรื่องมี MP3 + รูป + build ผ่าน

## Automation

Prompt สำหรับ Cursor Automation: [.cursor/automations/news-edition-daily.md](../automations/news-edition-daily.md)

- Cron **23:00 UTC** = 06:00 ไทย (ฉบับเช้า)
- Cron **11:00 UTC** = 18:00 ไทย (ฉบับเย็น)

## อ้างอิง

- กฎเนื้อหา: `.cursor/rules/pages1-news-content.mdc`
- เขียนข่าว: `news-writer` skill
