#!/usr/bin/env node
/**
 * Re-fetch Thai PBS metadata for Aug 2–15 imports:
 * fix category (from BreadcrumbList), decode titles, excerpts, rename bad slugs.
 */
import { readdir, readFile, writeFile, rename, unlink } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const NEWS = join(ROOT, 'src/content/news/2026/08');

const CATEGORY_MAP = {
	การเมือง: 'การเมือง',
	เศรษฐกิจ: 'เศรษฐกิจ',
	กีฬา: 'กีฬา',
	บันเทิง: 'บันเทิง',
	ภูมิภาค: 'การเมือง',
	สังคม: 'เศรษฐกิจ',
	ต่างประเทศ: 'การเมือง',
	อาชญากรรม: 'การเมือง',
	สิ่งแวดล้อม: 'เศรษฐกิจ',
	ภัยพิบัติ: 'เศรษฐกิจ',
	พระราชสำนัก: 'การเมือง',
	ไลฟ์สไตล์: 'บันเทิง',
	'ไอที/เทคโนโลยี': 'ไอที/เทคโนโลยี',
	ไอที: 'ไอที/เทคโนโลยี',
	เทคโนโลยี: 'ไอที/เทคโนโลยี',
	วิทยาศาสตร์เทคโนโลยี: 'ไอที/เทคโนโลยี',
	'วิทยาศาสตร์และเทคโนโลยี': 'ไอที/เทคโนโลยี',
};

const SLUG_KEYWORDS = [
	[/พยากรณ์อากาศ|สภาพอากาศ|ฝนตก|อุตุ|คลื่นความร้อน|พายุ/i, 'weather'],
	[/ฟุตบอลโลก|World Cup|ทีมชาติไทย|ชิงแชมป์อาเซียน|AFF/i, 'football'],
	[/วอลเลย์บอล|VNL/i, 'volleyball'],
	[/ราคาทอง|ทองคำ/i, 'gold-price'],
	[/Forex|forex|เว็บพนัน/i, 'forex'],
	[/อิหร่าน|ฮอร์มุซ/i, 'iran-hormuz'],
	[/เมียนมา/i, 'myanmar'],
	[/หวย|สลากกินแบ่ง/i, 'thai-lottery'],
	[/EV|รถยนต์ไฟฟ้า|ยานยนต์/i, 'ev'],
	[/แผ่นดินไหว/i, 'earthquake'],
	[/SpaceX|spacex/i, 'spacex'],
	[/ยาเสพติด/i, 'narcotics'],
	[/ทุจริตสอบ|สอบท้องถิ่น/i, 'exam-fraud'],
	[/ไทยช่วยไทย/i, 'thai-chuai-thai'],
	[/Jetstar|เจ็ตสตาร์/i, 'jetstar'],
	[/ภาษี|tax/i, 'tax'],
	[/MFA|username|password|ไซเบอร์|แฮก/i, 'cyber'],
	[/F-16|f-16/i, 'f16'],
];

function decodeEntities(s = '') {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.replace(/\u00a0/g, ' ')
		.trim();
}

function toSlug(title, day, contentId) {
	let base = '';
	for (const [re, kw] of SLUG_KEYWORDS) {
		if (re.test(title)) {
			base = kw;
			break;
		}
	}
	if (!base) {
		const ascii = title
			.replace(/[""«»]/g, '')
			.replace(/[^\u0E00-\u0E7Fa-zA-Z0-9\s-]/g, ' ')
			.toLowerCase()
			.replace(/[^\x00-\x7F]/g, '')
			.replace(/\s+/g, '-')
			.replace(/-+/g, '-')
			.replace(/^-|-$/g, '')
			.slice(0, 40);
		base = ascii && ascii.length >= 3 && !/^[\d-]+$/.test(ascii) ? ascii : `news-${contentId}`;
	}
	return `${base}-aug-${day}-c${contentId}`.slice(0, 100);
}

async function fetchHtml(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Pages1NewsBot/1.0 (+https://pages1.news)' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return new TextDecoder('utf-8').decode(await res.arrayBuffer()).replace(/\0/g, '');
}

function extractFromHtml(html) {
	const title = decodeEntities(
		html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] ||
			html.match(/<title>([^<|]+)/)?.[1] ||
			'',
	);
	const description = decodeEntities(
		html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '',
	);
	const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';

	let categoryRaw = '';
	for (const m of html.matchAll(
		/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
	)) {
		try {
			const data = JSON.parse(m[1]);
			if (data['@type'] === 'BreadcrumbList' && Array.isArray(data.itemListElement)) {
				const last = data.itemListElement[data.itemListElement.length - 1];
				if (last?.name && last.name !== 'ข่าว') categoryRaw = last.name;
			}
		} catch {
			/* ignore */
		}
	}
	if (!categoryRaw) {
		const crumb = html.match(
			/BreadcrumbList[\s\S]{0,800}?"name"\s*:\s*"(การเมือง|เศรษฐกิจ|กีฬา|บันเทิง|ภูมิภาค|สังคม|ต่างประเทศ|อาชญากรรม|สิ่งแวดล้อม|ภัยพิบัติ|พระราชสำนัก|ไลฟ์สไตล์|ไอที[^"]*)"/,
		);
		if (crumb) categoryRaw = crumb[1];
	}
	const category = CATEGORY_MAP[categoryRaw] || CATEGORY_MAP[categoryRaw.replace(/\/.*/, '')] || 'การเมือง';

	const paras = [];
	for (const m of html.matchAll(/<p(?:\s[^>]*)?>([^<]+)</g)) {
		const text = decodeEntities(m[1]);
		if (text.length < 40) continue;
		if (/อ่านข่าว|แท็กที่เกี่ยวข้อง|ติดตามข่าว/.test(text)) continue;
		paras.push(text);
	}
	const paragraphs = [...new Set(paras)].slice(0, 3);
	return { title, description, image, category, categoryRaw, paragraphs };
}

function yamlEscape(s) {
	return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function fixFile(filePath) {
	const raw = await readFile(filePath, 'utf8');
	const url = raw.match(/^sourceUrl:\s*"(.*)"/m)?.[1];
	const publishedAt = raw.match(/^publishedAt:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
	const featured = /featured:\s*true/.test(raw);
	if (!url || !publishedAt) return null;
	const contentId = url.match(/(\d+)$/)?.[1];
	const day = publishedAt.slice(8, 10);

	const html = await fetchHtml(url);
	const meta = extractFromHtml(html);
	if (!meta.title || meta.paragraphs.length === 0) {
		console.warn(`  skip empty ${filePath}`);
		return null;
	}

	const slug = toSlug(meta.title, day, contentId);
	const excerpt = (meta.description || meta.paragraphs[0]).slice(0, 220);
	const imageMeta = meta.image
		? `image: "/images/news/${slug}.jpg"
imageCredit: "ภาพ: ไทยพีบีเอส"
imageSourceUrl: "${meta.image}"
imageRights: source_thumbnail`
		: `image: "https://picsum.photos/seed/${slug}/800/500"
imageRights: placeholder`;

	const content = `---
title: "${yamlEscape(meta.title)}"
excerpt: "${yamlEscape(excerpt)}"
category: "${meta.category}"
featured: ${featured}
${imageMeta}
sourceName: "ไทยพีบีเอส"
sourceUrl: "${url}"
publishedAt: ${publishedAt}
author: "ไทยพีบีเอส"
rightsModel: excerpt_only
---

${meta.paragraphs.join('\n\n')}
`;

	const dir = dirname(filePath);
	const newPath = join(dir, `${slug}.md`);
	await writeFile(newPath, content, 'utf8');
	if (newPath !== filePath) {
		await unlink(filePath).catch(() => {});
	}
	console.log(`  ✓ ${slug} [${meta.categoryRaw || '?'}→${meta.category}]`);
	return { slug, url, old: filePath, newPath };
}

const days = process.argv.slice(2);
const targets =
	days.length > 0
		? days
		: Array.from({ length: 14 }, (_, i) => String(i + 2).padStart(2, '0'));

for (const day of targets) {
	const dir = join(NEWS, day);
	let files = [];
	try {
		files = (await readdir(dir)).filter((f) => f.endsWith('.md'));
	} catch {
		continue;
	}
	console.log(`\n=== 2026-08-${day} (${files.length}) ===`);
	// Ensure only one featured after rewrite: first file keeps featured if any was featured
	const hadFeatured = [];
	for (const f of files) {
		const raw = await readFile(join(dir, f), 'utf8');
		if (/featured:\s*true/.test(raw)) hadFeatured.push(f);
	}
	for (const f of files) {
		try {
			await fixFile(join(dir, f));
			await new Promise((r) => setTimeout(r, 150));
		} catch (e) {
			console.warn(`  ! ${f}: ${e.message}`);
		}
	}
	// Re-normalize featured: exactly one per day (prefer weather/politics first alphabetically by existing)
	const updated = (await readdir(dir)).filter((x) => x.endsWith('.md'));
	let featuredSet = false;
	for (const f of updated) {
		const p = join(dir, f);
		let t = await readFile(p, 'utf8');
		if (!featuredSet && /featured:\s*true/.test(t)) {
			featuredSet = true;
			continue;
		}
		if (/featured:\s*true/.test(t)) {
			t = t.replace(/featured:\s*true/, 'featured: false');
			await writeFile(p, t);
		}
	}
	if (!featuredSet && updated.length) {
		const p = join(dir, updated[0]);
		let t = await readFile(p, 'utf8');
		t = t.replace(/featured:\s*false/, 'featured: true');
		await writeFile(p, t);
		console.log(`  ★ featured → ${updated[0]}`);
	}
}

console.log('\nDone fixup.');
