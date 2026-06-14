#!/usr/bin/env node
/**
 * Generate Thai TTS audio for news articles using Microsoft Edge Neural voices (free).
 *
 * Usage:
 *   node scripts/generate-article-audio.mjs              # missing or stale (md newer than mp3)
 *   node scripts/generate-article-audio.mjs --force      # regenerate all
 *   node scripts/generate-article-audio.mjs --id 2026/06/14/slug
 */

import { access, mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EdgeTTS } from 'node-edge-tts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const NEWS_DIR = join(ROOT, 'src', 'content', 'news');
const OUT_DIR = join(ROOT, 'public', 'audio', 'news');

const VOICE = 'th-TH-PremwadeeNeural';
const LANG = 'th-TH';
const RATE = '-5%';
const REQUEST_DELAY_MS = 400;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 60000;

async function exists(path) {
	try {
		await access(path, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}

async function collectMarkdownFiles(dir) {
	const entries = await readdir(dir, { withFileTypes: true });
	const files = [];

	for (const entry of entries) {
		const fullPath = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...(await collectMarkdownFiles(fullPath)));
		} else if (entry.isFile() && entry.name.endsWith('.md')) {
			files.push(fullPath);
		}
	}

	return files;
}

function parseNewsFile(raw) {
	const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
	if (!match) return null;

	const frontmatter = match[1];
	const body = match[2].trim();

	const quotedTitle = frontmatter.match(/^title:\s*"([^"]+)"/m);
	const singleQuotedTitle = frontmatter.match(/^title:\s*'([^']+)'/m);
	const plainTitle = frontmatter.match(/^title:\s*(.+)$/m);
	const title = (
		quotedTitle?.[1] ??
		singleQuotedTitle?.[1] ??
		plainTitle?.[1]?.trim()
	)?.trim();

	if (!title || !body) return null;

	return { title, body };
}

function stripMarkdown(text) {
	return text
		.replace(/^>\s?/gm, '')
		.replace(/!\[[^\]]*\]\([^)]+\)/g, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
		.replace(/[*_~`#]/g, '')
		.replace(/\s+/g, ' ')
		.trim();
}

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseArgs(argv) {
	const force = argv.includes('--force');
	const idIndex = argv.indexOf('--id');
	const id = idIndex >= 0 ? argv[idIndex + 1] : undefined;
	return { force, id };
}

/** Regenerate when mp3 is missing or source markdown is newer than the mp3. */
async function needsRegeneration(sourcePath, outPath, force) {
	if (force) return true;
	if (!(await exists(outPath))) return true;

	const [sourceStat, outStat] = await Promise.all([stat(sourcePath), stat(outPath)]);
	return sourceStat.mtimeMs > outStat.mtimeMs;
}

async function main() {
	const { force, id } = parseArgs(process.argv.slice(2));
	const markdownFiles = await collectMarkdownFiles(NEWS_DIR);

	const targets = markdownFiles.filter((filePath) => {
		const articleId = relative(NEWS_DIR, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
		return !id || articleId === id || articleId.endsWith(`/${id}`);
	});

	if (targets.length === 0) {
		console.error(id ? `No article found for id: ${id}` : 'No news markdown files found.');
		process.exit(1);
	}

	const tts = new EdgeTTS({
		voice: VOICE,
		lang: LANG,
		rate: RATE,
		outputFormat: 'audio-24khz-96kbitrate-mono-mp3',
		timeout: TIMEOUT_MS,
	});

	let generated = 0;
	let skipped = 0;
	let failed = 0;

	for (const filePath of targets) {
		const articleId = relative(NEWS_DIR, filePath).replace(/\\/g, '/').replace(/\.md$/, '');
		const outPath = join(OUT_DIR, `${articleId}.mp3`);

		if (!(await needsRegeneration(filePath, outPath, force))) {
			skipped += 1;
			continue;
		}

		const raw = await readFile(filePath, 'utf8');
		const parsed = parseNewsFile(raw);
		if (!parsed) {
			console.warn(`Skip (invalid frontmatter): ${articleId}`);
			failed += 1;
			continue;
		}

		const text = `${parsed.title}. ${stripMarkdown(parsed.body)}`;
		await mkdir(dirname(outPath), { recursive: true });

		try {
			let lastError;
			for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
				try {
					await tts.ttsPromise(text, outPath);
					lastError = undefined;
					break;
				} catch (error) {
					lastError = error;
					if (attempt < MAX_ATTEMPTS) {
						await sleep(REQUEST_DELAY_MS * attempt * 2);
					}
				}
			}

			if (lastError) {
				throw lastError;
			}

			const sizeKb = Math.round((await stat(outPath)).size / 1024);
			console.log(`OK ${articleId} (${sizeKb} KB)`);
			generated += 1;
			await sleep(REQUEST_DELAY_MS);
		} catch (error) {
			console.error(`FAIL ${articleId}:`, error instanceof Error ? error.message : error);
			failed += 1;
		}
	}

	console.log(`Done — generated: ${generated}, skipped: ${skipped}, failed: ${failed}`);

	if (generated === 0 && failed > 0) {
		process.exit(1);
	}
}

main().catch((error) => {
	console.error(error);
	process.exit(1);
});
