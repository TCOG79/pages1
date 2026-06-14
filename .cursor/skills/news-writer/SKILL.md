---
name: news-writer
description: เขียนและสร้างไฟล์ข่าว Markdown สำหรับ PAGES 1 NEWS โดยสรุปสั้น 2-3 ย่อหน้า + ลิงก์ต้นฉบับ. ใช้เมื่อ user ขอเพิ่มข่าว เขียนข่าวใหม่ หรือสร้างไฟล์ .md ใน src/content/news/
---

# News Writer — PAGES 1 NEWS

## เมื่อไหร่ใช้

- User ขอเพิ่มข่าว เขียนข่าวใหม่ สร้างไฟล์ `.md`
- หลัง `news-reader` ดึงเนื้อหาจากต้นทางแล้ว

## ขั้นตอน

1. อ่าน template: [article-template.md](article-template.md)
2. ดึงเนื้อหาจาก `sourceUrl` ผ่าน `news-reader`
3. สร้างไฟล์ `src/content/news/YYYY/MM/DD/{slug}.md`
   - โฟลเดอร์วันที่ derive จาก `publishedAt` (Asia/Bangkok) — ใช้ `getNewsFilePath` ใน `src/utils/news-path.ts`
   - slug = kebab-case ภาษาอังกฤษจากหัวข้อ
4. **เนื้อหา body = สรุปสั้น 2–3 ย่อหน้า** ไม่คัดลอกบทความเต็ม
5. ตั้ง `rightsModel: excerpt_only`
6. ตรวจ `featured: true` — มีได้แค่ 1 เรื่องต่อวัน
7. รัน `npm run fetch-image -- {slug} {sourceUrl}` (ถ้ายังไม่มีรูป)
8. รัน **`npm run publish-edition`** — prebuild สร้างเสียง → build → auto push ขึ้น remote

## Frontmatter บังคับ

```yaml
title, excerpt, category, featured, image, sourceName, sourceUrl, publishedAt, author, rightsModel
```

Optional: `imageCredit`, `originalAuthor`

## เนื้อหา

- สรุปจาก lead + ประเด็นหลัก 2–3 ย่อหน้า
- ห้ามคัดลอกบทความฉบับเต็ม
- ห้ามแก้ความหมายข่าวต้นทาง
- blockquote สำหรับคำพูดตรงสั้นๆ ได้

## Workflow แนะนำ

```
news-reader → news-summarizer → news-citation → news-writer → fetch-image → npm run publish-edition
```

ฉบับรายวัน: `.cursor/skills/news-edition/SKILL.md`

## เสียงอ่านข่าว

- ไฟล์ MP3: `public/audio/news/{articleId}.mp3` (articleId = path แบบ `2026/06/14/slug`)
- สคริปต์อ่าน **title + body** แล้วส่ง Microsoft Edge Neural TTS (`th-TH-PremwadeeNeural`)
- หน้าข่าวแสดงปุ่ม "ฟังข่าว" เมื่อมีไฟล์ MP3 เท่านั้น
- **Dev:** รัน `npm run generate-audio` หลังเพิ่ม/แก้ `.md` (dev server ไม่ trigger prebuild)
- **Deploy:** `npm run build` สร้างเสียงที่ขาดให้อัตโนมัติผ่าน prebuild
- แก้เนื้อหาแล้วเสียง stale: สคริปต์ regenerate เมื่อ `.md` ใหม่กว่า `.mp3` หรือใช้ `--force`
