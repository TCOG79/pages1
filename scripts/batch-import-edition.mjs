#!/usr/bin/env node
/**
 * One-off batch import news from Thai PBS archives.
 * Usage: node scripts/batch-import-edition.mjs 2026-06-21 2026-06-30
 */

import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const CATEGORY_MAP = {
	การเมือง: 'การเมือง',
	เศรษฐกิจ: 'เศรษฐกิจ',
	กีฬา: 'กีฬา',
	บันเทิง: 'บันเทิง',
	'ไอที/เทคโนโลยี': 'ไอที/เทคโนโลยี',
	ยานยนต์: 'ยานยนต์',
	หวยไทย: 'หวยไทย',
	ภูมิภาค: 'การเมือง',
	สังคม: 'เศรษฐกิจ',
	ต่างประเทศ: 'การเมือง',
	อาชญากรรม: 'การเมือง',
	สิ่งแวดล้อม: 'เศรษฐกิจ',
};

const TARGET_CATEGORIES = [
	'การเมือง',
	'เศรษฐกิจ',
	'กีฬา',
	'บันเทิง',
	'ไอที/เทคโนโลยี',
	'ยานยนต์',
	'หวยไทย',
];

const SLUG_KEYWORDS = [
	[/พยากรณ์อากาศ|สภาพอากาศ|ฝนตก|คลื่นความร้อน/i, 'heavy-rain-warning'],
	[/ฟุตบอลโลก|World Cup/i, 'world-cup'],
	[/เลือกตั้ง.*ผู้ว่าฯ|ผู้ว่าฯ กทม|เลือกตั้ง กทม/i, 'bkk-governor-poll'],
	[/ทุจริตสอบ|สอบท้องถิ่น|สวมสิทธิสอบ/i, 'local-exam-fraud'],
	[/ราคาทอง|ทองคำ/i, 'gold-price'],
	[/Forex|forex|เว็บพนัน/i, 'forex'],
	[/แผ่นดินไหว.*เวเนซุเอลา|เวเนซุเอลา.*แผ่นดินไหว/i, 'venezuela-earthquake'],
	[/อิหร่าน|ฮอร์มุซ/i, 'iran-hormuz'],
	[/TH-AI Passport/i, 'th-ai-passport'],
	[/ไทยช่วยไทย/i, 'thai-chuai-thai'],
	[/เมียนมา/i, 'myanmar'],
	[/วอลเลย์บอล|VNL/i, 'volleyball-vnl'],
	[/หวย|สลากกินแบ่ง/i, 'thai-lottery'],
	[/EV|รถยนต์ไฟฟ้า/i, 'ev'],
	[/ญี่ปุ่น.*ฟุตบอล|บราซิล.*ญี่ปุ่น/i, 'japan-world-cup'],
	[/มือปืน/i, 'shooting'],
	[/ปลัด.*ภูเก็ต/i, 'phuket-governor'],
	[/ปลัดรุ่งเรือง/i, 'rungreung-exam'],
	[/พายุ|เสาไฟฟ้าล้ม/i, 'storm-power-pole'],
	[/ยาเสพติด/i, 'narcotics'],
	[/ทับลาน/i, 'thap-lan'],
	[/หนองจาน/i, 'nong-jan'],
];

function toSlug(title, date, contentId) {
	const day = date.slice(8, 10);
	const mo = date.slice(5, 7);
	const month =
		mo === '06' ? 'june' : mo === '07' ? 'july' : mo === '08' ? 'august' : `m${mo}`;
	let base = '';
	for (const [re, kw] of SLUG_KEYWORDS) {
		if (re.test(title)) {
			base = kw;
			break;
		}
	}
	if (!base) {
		// strip quotes and non-ascii for readable slug; fallback to content id
		const cleaned = title.replace(/["""]/g, '').trim();
		const ascii = cleaned
			.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s-]/g, '')
			.slice(0, 50)
			.toLowerCase()
			.replace(/\s+/g, '-')
			.replace(/[^\x00-\x7F]/g, '')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '');
		base = ascii && ascii.length >= 3 ? ascii : `news-${contentId}`;
	}
	return `${base}-${month}-${day}-c${contentId}`.slice(0, 100);
}

function extractMeta(html) {
	const title =
		html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] ||
		html.match(/<title>([^<|]+)/)?.[1]?.trim();
	const description = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '';
	const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';
	return { title, description, image };
}

function extractCategory(html) {
	const cats = [...html.matchAll(/>(การเมือง|เศรษฐกิจ|กีฬา|บันเทิง|ภูมิภาค|สังคม|ต่างประเทศ|อาชญากรรม|สิ่งแวดล้อม|ยานยนต์|หวยไทย|ไอที[^<]*)</g)];
	if (!cats.length) return 'การเมือง';
	const raw = cats[0][1].replace(/\/เทคโนโลยี/, '');
	return CATEGORY_MAP[raw] || CATEGORY_MAP[cats[0][1]] || 'การเมือง';
}

function extractParagraphs(html) {
	const paras = [];
	for (const m of html.matchAll(/<p(?:\s[^>]*)?>([^<]+)</g)) {
		const text = m[1].trim();
		if (text.length < 40) continue;
		if (text.includes('อ่านข่าว') || text.includes('แท็กที่เกี่ยวข้อง')) continue;
		paras.push(text);
	}
	return [...new Set(paras)].slice(0, 3);
}

async function fetchHtml(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Pages1NewsBot/1.0 (+https://pages1.news)' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
	const buf = await res.arrayBuffer();
	return new TextDecoder('utf-8').decode(buf).replace(/\0/g, '');
}

async function getArchiveUrls(date) {
	const html = await fetchHtml(`https://www.thaipbs.or.th/news/archive/${date}`);
	const ids = [...html.matchAll(/\/news\/content\/(\d+)/g)].map((m) => m[1]);
	return [...new Set(ids)].map((id) => `https://www.thaipbs.or.th/news/content/${id}`);
}

async function fetchArticle(url) {
	const html = await fetchHtml(url);
	const contentId = url.match(/(\d+)$/)?.[1];
	const { title, description, image } = extractMeta(html);
	const category = extractCategory(html);
	const paragraphs = extractParagraphs(html);
	if (!title || paragraphs.length === 0) return null;
	return { contentId, title, description, image, category, paragraphs, url };
}

function buildMarkdown(article, date, featured) {
	const [y, m, d] = date.split('-');
	const slug = toSlug(article.title, date, article.contentId);
	const body = article.paragraphs.join('\n\n');
	const excerpt = article.description.slice(0, 200);

	return {
		slug,
		path: join(ROOT, 'src/content/news', y, m, d, `${slug}.md`),
		content: `---
title: "${article.title.replace(/"/g, '\\"')}"
excerpt: "${excerpt.replace(/"/g, '\\"')}"
category: "${article.category}"
featured: ${featured}
image: "/images/news/${slug}.jpg"
imageCredit: "ภาพ: ไทยพีบีเอส"
sourceName: "ไทยพีบีเอส"
sourceUrl: "${article.url}"
publishedAt: ${date}
author: "ไทยพีบีเอส"
rightsModel: excerpt_only
---

${body}
`,
	};
}

async function getExistingContentIds(date) {
	const [y, m, d] = date.split('-');
	const dir = join(ROOT, 'src/content/news', y, m, d);
	let files = [];
	try {
		files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
	} catch {
		return { ids: new Set(), count: 0 };
	}
	const ids = new Set();
	for (const file of files) {
		const m = file.match(/-c(\d+)\.md$/);
		if (m) ids.add(m[1]);
		const raw = await readFile(join(dir, file), 'utf8');
		const url = raw.match(/^sourceUrl: "(.*)"/m)?.[1];
		const id = url?.match(/(\d+)$/)?.[1];
		if (id) ids.add(id);
	}
	return { ids, count: files.length };
}

async function importDay(date, { append = false, targetCount = 8 } = {}) {
	console.log(`\n=== ${date}${append ? ' (append)' : ''} ===`);
	const { ids: existingIds, count: existingCount } = append
		? await getExistingContentIds(date)
		: { ids: new Set(), count: 0 };
	const need = append ? Math.max(0, targetCount - existingCount) : targetCount;

	if (append && need === 0) {
		console.log(`  already ${existingCount} articles, skip`);
		return [];
	}

	const urls = await getArchiveUrls(date);
	const articles = [];
	for (const url of urls) {
		const id = url.match(/(\d+)$/)?.[1];
		if (existingIds.has(id)) continue;
		try {
			const a = await fetchArticle(url);
			if (a) articles.push(a);
		} catch (e) {
			console.warn(`  skip ${url}: ${e.message}`);
		}
		await new Promise((r) => setTimeout(r, 200));
	}

	const selected = [];
	for (const cat of TARGET_CATEGORIES) {
		if (selected.length >= need) break;
		const pick = articles.find((a) => a.category === cat && !selected.includes(a));
		if (pick) selected.push(pick);
	}
	for (const a of articles) {
		if (selected.length >= need) break;
		if (!selected.includes(a)) selected.push(a);
	}

	if (selected.length === 0) {
		console.log('  no new articles');
		return [];
	}

	const [y, m, d] = date.split('-');
	await mkdir(join(ROOT, 'src/content/news', y, m, d), { recursive: true });

	const written = [];
	const usedSlugs = new Set();
	for (let i = 0; i < selected.length; i++) {
		const featured = !append && i === 0;
		const { slug, path, content } = buildMarkdown(selected[i], date, featured);
		if (usedSlugs.has(slug)) continue;
		usedSlugs.add(slug);
		await writeFile(path, content, 'utf8');
		written.push({ slug, url: selected[i].url, path });
		console.log(`  + ${slug}`);
	}
	return written;
}

function parseDates(start, end) {
	const dates = [];
	const cur = new Date(`${start}T12:00:00+07:00`);
	const last = new Date(`${end}T12:00:00+07:00`);
	while (cur <= last) {
		const y = cur.getFullYear();
		const mo = String(cur.getMonth() + 1).padStart(2, '0');
		const da = String(cur.getDate()).padStart(2, '0');
		dates.push(`${y}-${mo}-${da}`);
		cur.setDate(cur.getDate() + 1);
	}
	return dates;
}

const args = process.argv.slice(2);
const append = args.includes('--append');
const dateArgs = args.filter((a) => !a.startsWith('--'));
const [start = '2026-06-21', end = '2026-06-30'] = dateArgs;
const allWritten = [];
for (const date of parseDates(start, end)) {
	const w = await importDay(date, { append });
	allWritten.push(...w);
}
console.log(`\nTotal: ${allWritten.length} articles`);
if (allWritten.length) {
	console.log('\nRun fetch-image for each slug, then npm run build');
}
