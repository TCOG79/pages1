# Template ไฟล์ข่าว PAGES 1 NEWS

## Frontmatter สมบูรณ์

```yaml
---
title: "หัวข้อจากต้นทาง"
excerpt: "1-2 ประโยคจาก lead ต้นทาง (สำหรับหน้าหลัก)"
category: "การเมือง"
featured: false
image: "/images/news/slug-name.jpg"
imageCredit: "ภาพ: ชื่อสำนักข่าวต้นทาง"
imageSourceUrl: "https://example.com/path/to/og-image.jpg"
imageRights: source_thumbnail
sourceName: "ชื่อสำนักข่าวต้นทาง"
sourceUrl: "https://example.com/article-url"
publishedAt: 2026-06-10
author: "ชื่อผู้รายงานจากต้นทาง"
rightsModel: excerpt_only
---
```

เมื่อดึงรูปไม่ได้:

```yaml
image: "https://picsum.photos/seed/slug-name/800/500"
imageRights: placeholder
```

## ดึงรูปจากต้นทาง

```bash
npm run fetch-image -- slug-name https://example.com/article source_thumbnail
```

`press_release` สำหรับข่าวแจกแจง/PR (เช่น ThaiPR)

## เนื้อหา (สรุปสั้น 2–3 ย่อหน้า)

**กฎสำคัญ:** สรุปจากต้นทาง ห้ามคัดลอกบทความฉบับเต็ม

```markdown
[ย่อหน้าที่ 1 — lead + ประเด็นหลัก]

[ย่อหน้าที่ 2 — รายละเอียดสำคัญ]

> "คำพูดโดยตรงสั้นๆ จากต้นทาง" — ชื่อ ตำแหน่ง (ถ้ามี)
```

## Checklist ก่อน publish

```
- [ ] frontmatter ครบทุกฟิลด์บังคับ
- [ ] sourceUrl ลิงก์ไปบทความต้นฉบับจริง
- [ ] body สรุป 2-3 ย่อหน้า ไม่ใช่เนื้อหาเต็ม
- [ ] rightsModel: excerpt_only
- [ ] รูป local + imageCredit หรือ placeholder + imageRights: placeholder
- [ ] publishedAt ตรงวันที่ต้นทางเผยแพร่จริง (ไม่ใช่วันที่ดึงฉบับ)
- [ ] npm run build ผ่าน
```

## การตั้งชื่อไฟล์

- Path: `src/content/news/YYYY/MM/DD/{slug}.md` (โฟลเดอร์ตาม `publishedAt` ใน timezone Asia/Bangkok)
- slug = kebab-case ภาษาอังกฤษ
- URL บนเว็บ: `/news/YYYY/MM/DD/{slug}/`
