#!/usr/bin/env node
/** Post-process imported news: fix entities, empty excerpts, featured picks */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
const DAYS = ['21','22','23','24','25','26','27','28','29','30'];

const FEATURED_BY_DAY = {
	'21': 'bkk-governor-poll', // or myanmar
	'22': 'gold-price',
	'23': 'iran-hormuz',
	'24': 'local-exam-fraud',
	'25': 'venezuela-earthquake',
	'26': 'storm-power-pole',
	'27': 'local-exam-fraud',
	'28': 'bkk-governor-poll', // election day result
	'29': 'nong-jan',
	'30': 'world-cup',
};

function decodeEntities(s) {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>');
}

function parseFrontmatter(raw) {
	const m = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
	if (!m) return null;
	const fm = {};
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(\w+):\s*(.*)$/);
		if (kv) fm[kv[1]] = kv[2].replace(/^"|"$/g, '');
	}
	return { fm, body: m[2].trim(), raw: m[1] };
}

function serialize(title, excerpt, category, featured, image, sourceUrl, publishedAt, body) {
	const esc = (s) => s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	return `---
title: "${esc(title)}"
excerpt: "${esc(excerpt)}"
category: "${category}"
featured: ${featured}
image: "${image}"
imageCredit: "ภาพ: ไทยพีบีเอส"
sourceName: "ไทยพีบีเอส"
sourceUrl: "${sourceUrl}"
publishedAt: ${publishedAt}
author: "ไทยพีบีเอส"
rightsModel: excerpt_only
---

${body}
`;
}

for (const day of DAYS) {
	const dir = join(ROOT, 'src/content/news/2026/06', day);
	const files = (await readdir(dir)).filter((f) => f.endsWith('.md')).sort();
	const featuredKey = FEATURED_BY_DAY[day];
	let featuredSet = false;

	for (const file of files) {
		const path = join(dir, file);
		const raw = await readFile(path, 'utf8');
		const parsed = parseFrontmatter(raw);
		if (!parsed) continue;

		let { fm, body } = parsed;
		let title = decodeEntities(fm.title || '');
		let excerpt = decodeEntities(fm.excerpt || '');
		if (!excerpt) {
			const first = body.split('\n\n')[0] || '';
			excerpt = first.slice(0, 180).trim();
			if (first.length > 180) excerpt += '…';
		}
		let featured = false;
		if (!featuredSet && featuredKey && file.includes(featuredKey)) {
			featured = true;
			featuredSet = true;
		} else if (!featuredSet && !featuredKey && file === files[0]) {
			featured = true;
			featuredSet = true;
		}
		const content = serialize(
			title,
			excerpt,
			fm.category,
			featured,
			fm.image || `/images/news/${file.replace('.md', '.jpg')}`,
			fm.sourceUrl,
			fm.publishedAt,
			body,
		);
		await writeFile(path, content, 'utf8');
	}
	console.log(`fixed 2026-06-${day} (${files.length} files)`);
}
