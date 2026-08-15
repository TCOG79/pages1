#!/usr/bin/env node
/**
 * For each Aug day missing ไอที/เทคโนโลยี, pick one Thai PBS tech/science article.
 */
import { readdir, readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CATEGORY_MAP = {
	วิทยาศาสตร์เทคโนโลยี: 'ไอที/เทคโนโลยี',
	'วิทยาศาสตร์และเทคโนโลยี': 'ไอที/เทคโนโลยี',
	ไอที: 'ไอที/เทคโนโลยี',
	เทคโนโลยี: 'ไอที/เทคโนโลยี',
};

function decodeEntities(s = '') {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&nbsp;/g, ' ')
		.trim();
}

async function fetchHtml(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Pages1NewsBot/1.0 (+https://pages1.news)' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return new TextDecoder('utf-8').decode(await res.arrayBuffer()).replace(/\0/g, '');
}

function breadcrumbCategory(html) {
	for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
		try {
			const data = JSON.parse(m[1]);
			if (data['@type'] === 'BreadcrumbList') {
				const last = data.itemListElement?.at(-1)?.name;
				if (last && last !== 'ข่าว') return last;
			}
		} catch {
			/* ignore */
		}
	}
	return '';
}

function isTechCategory(raw) {
	return /วิทยาศาสตร์|เทคโนโลยี|ไอที|tech/i.test(raw);
}

function extract(html) {
	const title = decodeEntities(html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] || '');
	const description = decodeEntities(
		html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '',
	);
	const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';
	const categoryRaw = breadcrumbCategory(html);
	const paras = [];
	for (const m of html.matchAll(/<p(?:\s[^>]*)?>([^<]+)</g)) {
		const text = decodeEntities(m[1]);
		if (text.length < 40) continue;
		if (/อ่านข่าว|แท็กที่เกี่ยวข้อง/.test(text)) continue;
		paras.push(text);
	}
	return {
		title,
		description,
		image,
		categoryRaw,
		paragraphs: [...new Set(paras)].slice(0, 3),
	};
}

function yamlEscape(s) {
	return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

async function dayHasIt(date) {
	const [y, m, d] = date.split('-');
	const dir = join(ROOT, 'src/content/news', y, m, d);
	try {
		for (const f of (await readdir(dir)).filter((x) => x.endsWith('.md'))) {
			const raw = await readFile(join(dir, f), 'utf8');
			if (/category:\s*"ไอที\/เทคโนโลยี"/.test(raw)) return true;
		}
	} catch {
		return false;
	}
	return false;
}

async function existingIds(date) {
	const [y, m, d] = date.split('-');
	const dir = join(ROOT, 'src/content/news', y, m, d);
	const ids = new Set();
	try {
		for (const f of await readdir(dir)) {
			const m2 = f.match(/-c(\d+)\.md$/);
			if (m2) ids.add(m2[1]);
			if (f.endsWith('.md')) {
				const raw = await readFile(join(dir, f), 'utf8');
				const id = raw.match(/sourceUrl: ".*\/(\d+)"/)?.[1];
				if (id) ids.add(id);
			}
		}
	} catch {
		/* empty */
	}
	return ids;
}

async function fillDay(date) {
	if (await dayHasIt(date)) {
		console.log(`${date}: has IT`);
		return;
	}
	const existing = await existingIds(date);
	const archive = await fetchHtml(`https://www.thaipbs.or.th/news/archive/${date}`);
	const ids = [...new Set([...archive.matchAll(/\/news\/content\/(\d+)/g)].map((m) => m[1]))];
	for (const id of ids) {
		if (existing.has(id)) continue;
		const url = `https://www.thaipbs.or.th/news/content/${id}`;
		try {
			const html = await fetchHtml(url);
			const meta = extract(html);
			if (!meta.title || !meta.paragraphs.length) continue;
			if (!isTechCategory(meta.categoryRaw) && !/AI|แอป|ไซเบอร์|เทคโนโลยี|ดาวเทียม|SpaceX|ดิจิทัล|สมาร์ท/i.test(meta.title)) {
				continue;
			}
			const day = date.slice(8, 10);
			const slug = `tech-aug-${day}-c${id}`;
			const [y, m, d] = date.split('-');
			const dir = join(ROOT, 'src/content/news', y, m, d);
			await mkdir(dir, { recursive: true });
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
category: "ไอที/เทคโนโลยี"
featured: false
${imageMeta}
sourceName: "ไทยพีบีเอส"
sourceUrl: "${url}"
publishedAt: ${date}
author: "ไทยพีบีเอส"
rightsModel: excerpt_only
---

${meta.paragraphs.join('\n\n')}
`;
			await writeFile(join(dir, `${slug}.md`), content, 'utf8');
			console.log(`+ ${date} ${slug} [${meta.categoryRaw}] ${meta.title.slice(0, 50)}`);
			return;
		} catch (e) {
			console.warn(`  skip ${id}: ${e.message}`);
		}
		await new Promise((r) => setTimeout(r, 120));
	}
	console.log(`! ${date}: no tech article found in archive`);
}

const dates = Array.from({ length: 14 }, (_, i) => `2026-08-${String(i + 2).padStart(2, '0')}`);
for (const date of dates) {
	await fillDay(date);
}
console.log('Done.');
