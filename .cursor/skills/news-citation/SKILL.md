---
name: news-citation
description: กำหนดและตรวจสอบแหล่งอ้างอิงข่าว sourceName, sourceUrl, imageCredit สำหรับ PAGES 1 NEWS. ใช้เมื่อ user ขอใส่แหล่งอ้างอิง source เครดิตรูป หรือลิงก์ต้นทาง
---

# News Citation — PAGES 1 NEWS

## เมื่อไหร่ใช้

- User ขอใส่แหล่งอ้างอิง เครดิตรูป ลิงก์ต้นทาง
- ก่อน `news-writer` สร้างไฟล์ `.md`
- ตรวจสอบ frontmatter ที่มีอยู่แล้ว

## ฟิลด์อ้างอิง

| ฟิลด์ | กฎ | แสดงผล |
|-------|-----|--------|
| `sourceName` | ชื่อสำนักข่าวต้นทาง (บังคับ) | byline + ปุ่มอ่านต้นฉบับ |
| `sourceUrl` | URL บทความต้นฉบับ (บังคับ) | canonical + ลิงก์กดไปต้นทาง |
| `author` | ผู้รายงานต้นทาง (บังคับ) | "รายงานโดย {author}" |
| `originalAuthor` | ผู้รายงานต้นทาง (optional) | ใช้แทน author ใน byline |
| `imageCredit` | บังคับเมื่อ `imageRights` ไม่ใช่ `placeholder` | ใต้รูป + ลิงก์ไป `sourceUrl` |
| `imageSourceUrl` | URL รูปต้นฉบับ (optional) | บันทึกใน frontmatter |
| `imageRights` | `source_thumbnail` \| `press_release` \| `placeholder` | ประเภทสิทธิ์รูป |
| `rightsModel` | `excerpt_only` (บังคับ) | โมเดลลิขสิทธิ์ข้อความ |

## หลักการ

- อ้างอิงต้นทางเสมอ — ห้ามเผยแพร่ข่าวโดยไม่มี source
- เนื้อหา body เป็นสรุปสั้น — ห้ามคัดลอกบทความเต็ม
- canonical URL ชี้ไปหน้าสรุปของหน้า1 (`/news/YYYY/MM/DD/{slug}/`) และระบุ `sourceUrl` เป็นลิงก์ต้นฉบับ
- หน้ารายละเอียดมี disclaimer + ปุ่ม CTA อ่านต้นฉบับ
- ไม่ลบเครดิตรูป
- ไม่ปลอมแหล่งหรือ URL
- รูปเก็บ local ที่ `/images/news/{slug}.jpg` — ห้าม hotlink CDN สำนักข่าว
- ดึงรูปด้วย `npm run fetch-image -- <slug> <sourceUrl>`

## หน้ากฎหมาย

- `/legal/disclaimer/` — ข้อจำกัดความรับผิดชอบ
- `/legal/copyright/` — นโยบายลิขสิทธิ์
- `/legal/takedown/` — แจ้งลบเนื้อหา
