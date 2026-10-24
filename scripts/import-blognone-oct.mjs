#!/usr/bin/env node
/**
 * Import Blognone IT articles for Oct 21–24 (one per day missing IT).
 */
import { mkdir, writeFile, readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATES = new Set(['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24']);

function decodeEntities(s = '') {
	return s
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ')
		.trim();
}

async function fetchHtml(url) {
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Pages1NewsBot/1.0 (+https://pages1.news)' },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
	return new TextDecoder('utf-8').decode(await res.arrayBuffer()).replace(/\0/g, '');
}

function bangkokDate(pubDateStr) {
	const d = new Date(pubDateStr);
	return new Intl.DateTimeFormat('en-CA', {
		timeZone: 'Asia/Bangkok',
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(d);
}

function toSlug(title, date, nodeId) {
	const day = date.slice(8, 10);
	const keywords = [
		[/Kimi|Moonshot/i, 'kimi'],
		[/Grab|Foodpanda/i, 'grab-foodpanda'],
		[/Ubuntu|php2shell|PHP/i, 'ubuntu-php'],
		[/Spotify/i, 'spotify'],
		[/Epic|Anti-Cheat|Fortnite/i, 'epic-eac'],
		[/PostgreSQL/i, 'postgresql'],
		[/Canva/i, 'canva-craft'],
		[/OpenAI|Google Cloud/i, 'openai-gcp'],
		[/Tesla/i, 'tesla'],
		[/Xbox|Game Pass/i, 'xbox-cloud'],
		[/iPhone Duo/i, 'iphone-duo'],
		[/Gemini|Anthropic|Claude|ChatGPT/i, 'ai-model'],
		[/Google|กูเกิล/i, 'google'],
	];
	let base = '';
	for (const [re, kw] of keywords) {
		if (re.test(title)) {
			base = kw;
			break;
		}
	}
	if (!base) base = `blognone-${nodeId}`;
	return `${base}-oct-${day}-bn${nodeId}`.slice(0, 100);
}

async function dayHasIt(date) {
	const [y, m, d] = date.split('-');
	const dir = join(ROOT, 'src/content/news', y, m, d);
	try {
		const files = await readdir(dir);
		for (const f of files.filter((x) => x.endsWith('.md'))) {
			const raw = await readFile(join(dir, f), 'utf8');
			if (/category:\s*"ไอที\/เทคโนโลยี"/.test(raw)) return true;
		}
	} catch {
		return false;
	}
	return false;
}

async function parseFeed() {
	const xml = await fetchHtml('https://www.blognone.com/atom.xml');
	const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => m[1]);
	const out = [];
	for (const item of items) {
		const title = decodeEntities(
			item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/)?.[1] || '',
		);
		const link = item.match(/<link>([^<]+)<\/link>/)?.[1]?.trim();
		const pubDate = item.match(/<pubDate>([^<]+)<\/pubDate>/)?.[1];
		if (!title || !link || !pubDate) continue;
		const date = bangkokDate(pubDate);
		const nodeId = link.match(/\/node\/(\d+)/)?.[1];
		if (!nodeId) continue;
		out.push({ title, link, date, nodeId, pubDate });
	}
	return out;
}

function extractBlognone(html) {
	const title = decodeEntities(
		html.match(/property="og:title"\s+content="([^"]+)"/)?.[1] || '',
	);
	const description = decodeEntities(
		html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '',
	);
	const image = html.match(/property="og:image"\s+content="([^"]+)"/)?.[1] || '';
	const paras = [];
	for (const m of html.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/g)) {
		const text = decodeEntities(m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
		if (text.length < 40) continue;
		if (/ติดตาม|สมัครสมาชิก|โฆษณา|Cookie|ที่มา/i.test(text)) continue;
		paras.push(text);
	}
	return { title, description, image, paragraphs: [...new Set(paras)].slice(0, 3) };
}

function yamlEscape(s) {
	return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

const feed = await parseFeed();
const byDate = new Map();
for (const item of feed) {
	if (!DATES.has(item.date)) continue;
	if (!byDate.has(item.date)) byDate.set(item.date, []);
	byDate.get(item.date).push(item);
}

console.log(
	`Feed items in range: ${[...byDate.values()].flat().length} across ${byDate.size} days`,
);

for (const [date, items] of [...byDate.entries()].sort()) {
	if (await dayHasIt(date)) {
		console.log(`${date}: already has IT, skip`);
		continue;
	}
	const pick =
		items.find((i) => !/เปิดรับสมัคร|Award|ส่อง \d+ จุด/i.test(i.title)) || items[0];
	try {
		const html = await fetchHtml(pick.link);
		const meta = extractBlognone(html);
		const title = meta.title || pick.title;
		const paragraphs = meta.paragraphs.length
			? meta.paragraphs
			: [meta.description || pick.title, 'อ่านรายละเอียดเพิ่มเติมได้ที่ต้นทาง Blognone'];
		const excerpt = (meta.description || paragraphs[0]).slice(0, 220);
		const slug = toSlug(title, date, pick.nodeId);
		const [y, m, d] = date.split('-');
		const dir = join(ROOT, 'src/content/news', y, m, d);
		await mkdir(dir, { recursive: true });
		const imageMeta = meta.image
			? `image: "/images/news/${slug}.jpg"
imageCredit: "ภาพ: Blognone"
imageSourceUrl: "${meta.image}"
imageRights: source_thumbnail`
			: `image: "https://picsum.photos/seed/${slug}/800/500"
imageRights: placeholder`;
		const content = `---
title: "${yamlEscape(title)}"
excerpt: "${yamlEscape(excerpt)}"
category: "ไอที/เทคโนโลยี"
featured: false
${imageMeta}
sourceName: "Blognone"
sourceUrl: "${pick.link}"
publishedAt: ${date}
author: "Blognone"
rightsModel: excerpt_only
---

${paragraphs.join('\n\n')}
`;
		await writeFile(join(dir, `${slug}.md`), content, 'utf8');
		console.log(`+ ${date} ${slug}`);
	} catch (e) {
		console.warn(`! ${date} ${pick.link}: ${e.message}`);
	}
	await new Promise((r) => setTimeout(r, 200));
}

for (const date of [...DATES].sort()) {
	if (!byDate.has(date) && !(await dayHasIt(date))) {
		console.log(`! ${date}: no Blognone item in feed — will try Thai PBS fill-missing-it`);
	}
}

console.log('Done Blognone import.');
