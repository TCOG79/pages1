#!/usr/bin/env node
/** Import specific Thai PBS articles by content ID */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');

// Re-use helpers from batch-import (inline minimal)
const CATEGORY_MAP = {
	การเมือง: 'การเมือง', เศรษฐกิจ: 'เศรษฐกิจ', กีฬา: 'กีฬา', บันเทิง: 'บันเทิง',
	ภูมิภาค: 'การเมือง', สังคม: 'เศรษฐกิจ', ต่างประเทศ: 'การเมือง', อาชญากรรม: 'การเมือง',
};

async function fetchHtml(url) {
	const res = await fetch(url, { headers: { 'User-Agent': 'Pages1NewsBot/1.0' } });
	return new TextDecoder().decode(await res.arrayBuffer()).replace(/\0/g, '');
}

function extract(html) {
	const title = html.match(/property="og:title"\s+content="([^"]+)"/)?.[1];
	const description = html.match(/property="og:description"\s+content="([^"]+)"/)?.[1] || '';
	const cats = [...html.matchAll(/>(การเมือง|เศรษฐกิจ|กีฬา|บันเทิง|ภูมิภาค|สังคม|ต่างประเทศ|อาชญากรรม)</g)];
	const category = CATEGORY_MAP[cats[0]?.[1]] || 'การเมือง';
	const paras = [];
	for (const m of html.matchAll(/<p(?:\s[^>]*)?>([^<]+)</g)) {
		const t = m[1].trim();
		if (t.length >= 40 && !t.includes('อ่านข่าว')) paras.push(t);
	}
	return { title, description, category, paragraphs: [...new Set(paras)].slice(0, 3) };
}

function slugFor(title, date, id) {
	const day = date.slice(8, 10);
	const month = date.slice(5, 7) === '07' ? 'july' : date.slice(5, 7) === '06' ? 'june' : `m${date.slice(5, 7)}`;
	if (/ฟุตบอลโลก|เอมบัปเป|นอร์เวย์.*ไอวอรี่/i.test(title)) return `world-cup-${month}-${day}-c${id}`;
	if (/สภาพอากาศ|ฝนตก/i.test(title)) return `heavy-rain-warning-${month}-${day}-c${id}`;
	return `news-${id}-${month}-${day}-c${id}`;
}

const [date, ...ids] = process.argv.slice(2);
const featuredId = process.argv.includes('--featured') ? ids[ids.length - 1] : null;
const contentIds = ids.filter((x) => /^\d+$/.test(x));

for (const id of contentIds) {
	const url = `https://www.thaipbs.or.th/news/content/${id}`;
	const html = await fetchHtml(url);
	const { title, description, category, paragraphs } = extract(html);
	if (!title || !paragraphs.length) { console.warn(`skip ${id}`); continue; }
	const slug = slugFor(title, date, id);
	const [y, m, d] = date.split('-');
	const path = join(ROOT, 'src/content/news', y, m, d, `${slug}.md`);
	await mkdir(join(ROOT, 'src/content/news', y, m, d), { recursive: true });
	const featured = id === featuredId;
	const content = `---
title: "${title.replace(/"/g, '\\"')}"
excerpt: "${(description || paragraphs[0]).slice(0, 200).replace(/"/g, '\\"')}"
category: "${category}"
featured: ${featured}
image: "/images/news/${slug}.jpg"
imageCredit: "ภาพ: ไทยพีบีเอส"
sourceName: "ไทยพีบีเอส"
sourceUrl: "${url}"
publishedAt: ${date}
author: "ไทยพีบีเอส"
rightsModel: excerpt_only
---

${paragraphs.join('\n\n')}
`;
	await writeFile(path, content);
	console.log(`+ ${slug}`);
}
