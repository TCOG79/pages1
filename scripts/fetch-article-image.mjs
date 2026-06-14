#!/usr/bin/env node
/**
 * Fetch og:image from a news article URL and save as local thumbnail.
 *
 * Usage:
 *   node scripts/fetch-article-image.mjs <slug> <sourceUrl> [imageRights]
 *
 * imageRights: source_thumbnail | press_release (default: source_thumbnail)
 */

import { lookup } from 'node:dns/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'images', 'news');
const MAX_WIDTH = 800;
const MAX_REDIRECTS = 5;

const PLACEHOLDER = (slug) => `https://picsum.photos/seed/${slug}/800/500`;

const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '::1']);

function isPrivateIpv4(a, b) {
	if (a === 10 || a === 127 || a === 0) return true;
	if (a === 169 && b === 254) return true;
	if (a === 172 && b >= 16 && b <= 31) return true;
	if (a === 192 && b === 168) return true;
	return false;
}

function isPrivateIp(hostname) {
	const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
	if (ipv4Match) {
		const octets = ipv4Match.slice(1, 5).map(Number);
		if (octets.some((n) => n > 255)) return true;
		return isPrivateIpv4(octets[0], octets[1]);
	}

	const lower = hostname.toLowerCase();
	if (lower === '::1') return true;
	if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) return true;
	return false;
}

function parseSafeUrl(urlString) {
	let parsed;
	try {
		parsed = new URL(urlString);
	} catch {
		throw new Error(`Invalid URL: ${urlString}`);
	}

	if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
		throw new Error(`Unsupported protocol: ${parsed.protocol}`);
	}

	const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

	if (BLOCKED_HOSTNAMES.has(hostname)) {
		throw new Error(`Blocked hostname: ${hostname}`);
	}

	if (
		hostname.endsWith('.local') ||
		hostname.endsWith('.internal') ||
		hostname.endsWith('.localhost')
	) {
		throw new Error(`Blocked hostname: ${hostname}`);
	}

	if (isPrivateIp(hostname)) {
		throw new Error(`Blocked private IP: ${hostname}`);
	}

	return parsed;
}

async function assertSafeUrl(urlString) {
	const parsed = parseSafeUrl(urlString);

	if (!isPrivateIp(parsed.hostname)) {
		try {
			const { address } = await lookup(parsed.hostname, { verbatim: true });
			if (isPrivateIp(address)) {
				throw new Error(`Blocked private IP: ${address}`);
			}
		} catch (error) {
			if (error instanceof Error && error.message.startsWith('Blocked private IP')) {
				throw error;
			}
			if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOTFOUND') {
				throw new Error(`Host not found: ${parsed.hostname}`);
			}
			throw error;
		}
	}

	return parsed;
}

async function safeFetch(urlString, options = {}) {
	let currentUrl = (await assertSafeUrl(urlString)).href;
	let redirects = 0;

	while (true) {
		const response = await fetch(currentUrl, { ...options, redirect: 'manual' });

		if (response.status >= 300 && response.status < 400) {
			const location = response.headers.get('location');
			if (!location) {
				throw new Error('Redirect without location header');
			}
			if (++redirects > MAX_REDIRECTS) {
				throw new Error('Too many redirects');
			}
			currentUrl = (await assertSafeUrl(new URL(location, currentUrl).href)).href;
			continue;
		}

		return response;
	}
}

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
	const response = await safeFetch(imageUrl, {
		headers: {
			'User-Agent': 'PAGES1News/1.0 (thumbnail fetch; +https://pages1.news)',
			Accept: 'image/*',
		},
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

	const pageResponse = await safeFetch(sourceUrl, {
		headers: {
			'User-Agent': 'PAGES1News/1.0 (og:image fetch; +https://pages1.news)',
			Accept: 'text/html',
		},
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
		await assertSafeUrl(imageUrl);
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

try {
	const result = await fetchArticleImage(slug, sourceUrl, imageRights);
	console.log(JSON.stringify(result, null, 2));
	process.exit(result.ok ? 0 : 2);
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
