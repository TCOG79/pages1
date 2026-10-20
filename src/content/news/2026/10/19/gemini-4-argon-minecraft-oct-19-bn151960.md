---
title: "เอเจนต์ Gemini 4 Argon เล่น Minecraft จบใน 27 ชั่วโมง ไม่ต้องใช้มนุษย์ช่วย"
excerpt: "Google DeepMind โชว์งานวิจัยการใช้เอเจนต์ 4 ตัวที่รันโมเดล Gemini 4 Argon ท้าทายตัวเองด้วยการมอบโจทย์ข้อเดียวคือให้เล่น Minecraft จนเอาชนะบอสตัวสุดท้าย Ender Dragon ได้ สิ่งที่ DeepMind ทำคือใช้เอเจนต์ Gemini 4 Argon รุ่"
category: "ไอที/เทคโนโลยี"
featured: false
image: "/images/news/gemini-4-argon-minecraft-oct-19-bn151960.jpg"
imageCredit: "ภาพ: Blognone"
imageSourceUrl: "https://www.blognone.com/sites/default/files/news-feature-image/2026/2026-10/minecraft.webp"
imageRights: source_thumbnail
sourceName: "Blognone"
sourceUrl: "https://www.blognone.com/node/151960"
publishedAt: 2026-10-19
author: "Blognone"
rightsModel: excerpt_only
---

Google DeepMind โชว์งานวิจัยการใช้เอเจนต์ 4 ตัวที่รันโมเดล Gemini 4 Argon ท้าทายตัวเองด้วยการมอบโจทย์ข้อเดียวคือให้เล่น Minecraft จนเอาชนะบอสตัวสุดท้าย Ender Dragon ได้

สิ่งที่ DeepMind ทำคือใช้เอเจนต์ Gemini 4 Argon รุ่นมาตรฐาน ตัวเดียวกับที่ใช้เขียนโค้ดทั่วไป ไม่ต้องใช้เอเจนต์รุ่นที่คัสตอมมาเพื่อ Minecraft (แต่เคยอ่านข้อมูล Minecraft มาบ้างในตอนเทรน) อีกทั้งไม่ได้กำหนดบทบาทให้เอเจนต์แต่ละตัวเลย ปล่อยให้สื่อสารกันเองผ่านแชท (แต่มี shared memory ร่วมกัน) ให้วางแผนกันเอง เขียนโค้ดกันเอง ดีบั๊กกันเอง

เงื่อนไขอีกข้อคือ เอเจนต์เหล่านี้ไม่สามารถควบคุมเกม Minecraft ได้โดยตรง แต่ใช้วิธีสั่งการ Minecraft ผ่านการเขียนโค้ดแทน (เช่น เดินไปตำแหน่งที่กำหนด แล้วขุดแร่เหล็กทุกอันในรัศมี 16 บล็อค) ผ่านไลบรารีชื่อ Mineflayer ที่เปิดให้โปรแกรมภายนอกอ่านค่าสถานะในเกมได้
