#!/usr/bin/env node
/**
 * Fetch og:image from a news article URL and save as local thumbnail.
 *
 * Usage:
 *   node scripts/fetch-article-image.mjs <slug> <sourceUrl> [imageRights]
 *
 * imageRights: source_thumbnail | press_release (default: source_thumbnail)
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'images', 'news');
const MAX_WIDTH = 800;

const PLACEHOLDER = (slug) => `https://picsum.photos/seed/${slug}/800/500`;

function extractMetaImage(html, baseUrl) {
	const patterns = [
		/<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i,
		/<meta[^>]+name=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
		/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image(?::src)?["']/i,
	];

	for (const pattern of patterns) {
		const match = html.match(pattern);
		if (match?.[1]) {
			try {
				return new URL(match[1].trim(), baseUrl).href;
			} catch {
				continue;
			}
		}
	}

	const onecms = html.match(/https:\/\/onecms\.thaipbs\.or\.th\/media\/[^"'\s<>]+\.jpg/i);
	if (onecms) return onecms[0];

	return null;
}

async function tryImportSharp() {
	try {
		const mod = await import('sharp');
		return mod.default;
	} catch {
		return null;
	}
}

async function downloadImage(imageUrl) {
	const response = await fetch(imageUrl, {
		headers: {
			'User-Agent': 'PAGES1News/1.0 (thumbnail fetch; +https://pages1.news)',
			Accept: 'image/*',
		},
		redirect: 'follow',
	});

	if (!response.ok) {
		throw new Error(`Image fetch failed: ${response.status} ${response.statusText}`);
	}

	const contentType = response.headers.get('content-type') ?? '';
	if (!contentType.startsWith('image/')) {
		throw new Error(`Not an image: ${contentType}`);
	}

	return Buffer.from(await response.arrayBuffer());
}

async function saveThumbnail(buffer, outPath) {
	const sharp = await tryImportSharp();

	if (sharp) {
		const resized = await sharp(buffer)
			.resize({ width: MAX_WIDTH, withoutEnlargement: true })
			.jpeg({ quality: 82, mozjpeg: true })
			.toBuffer();
		await writeFile(outPath, resized);
		return;
	}

	await writeFile(outPath, buffer);
}

async function fetchArticleImage(slug, sourceUrl, imageRights = 'source_thumbnail') {
	await mkdir(OUT_DIR, { recursive: true });

	const pageResponse = await fetch(sourceUrl, {
		headers: {
			'User-Agent': 'PAGES1News/1.0 (og:image fetch; +https://pages1.news)',
			Accept: 'text/html',
		},
		redirect: 'follow',
	});

	if (!pageResponse.ok) {
		throw new Error(`Page fetch failed: ${pageResponse.status} ${pageResponse.statusText}`);
	}

	const html = await pageResponse.text();
	const imageUrl = extractMetaImage(html, sourceUrl);

	if (!imageUrl) {
		return {
			ok: false,
			image: PLACEHOLDER(slug),
			imageRights: 'placeholder',
			imageSourceUrl: null,
			reason: 'no og:image found',
		};
	}

	const ext = imageRights === 'press_release' ? '.jpg' : '.jpg';
	const localPath = `/images/news/${slug}${ext}`;
	const outPath = join(OUT_DIR, `${slug}${ext}`);

	try {
		const buffer = await downloadImage(imageUrl);
		await saveThumbnail(buffer, outPath);

		return {
			ok: true,
			image: localPath,
			imageSourceUrl: imageUrl,
			imageRights,
			reason: null,
		};
	} catch (error) {
		return {
			ok: false,
			image: PLACEHOLDER(slug),
			imageRights: 'placeholder',
			imageSourceUrl: imageUrl,
			reason: error instanceof Error ? error.message : String(error),
		};
	}
}

const [slug, sourceUrl, imageRights = 'source_thumbnail'] = process.argv.slice(2);

if (!slug || !sourceUrl) {
	console.error('Usage: node scripts/fetch-article-image.mjs <slug> <sourceUrl> [imageRights]');
	process.exit(1);
}

const result = await fetchArticleImage(slug, sourceUrl, imageRights);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 2);
