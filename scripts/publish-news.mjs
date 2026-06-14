#!/usr/bin/env node
/**
 * Commit and push news-related changes only (content, images, audio, redirects).
 *
 * Usage:
 *   node scripts/publish-news.mjs              # stage → commit → push
 *   node scripts/publish-news.mjs --dry-run    # preview only
 *   node scripts/publish-news.mjs --no-push    # commit without push
 */

import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const NEWS_PATHSPECS = [
	'src/content/news',
	'public/images/news',
	'public/audio/news',
	'src/config/news-redirects.ts',
];

function runGit(args, options = {}) {
	const result = execFileSync('git', args, {
		cwd: ROOT,
		encoding: 'utf8',
		stdio: options.stdio ?? ['ignore', 'pipe', 'pipe'],
	});
	return typeof result === 'string' ? result.trim() : '';
}

function runGitInherit(args) {
	execFileSync('git', args, { cwd: ROOT, stdio: 'inherit' });
}

function isGitRepo() {
	try {
		runGit(['rev-parse', '--git-dir']);
		return true;
	} catch {
		return false;
	}
}

function listChangedNewsFiles() {
	const output = runGit(['status', '--porcelain', '--untracked-files=all']);
	if (!output) return [];

	return output
		.split('\n')
		.filter(Boolean)
		.map((line) => line.slice(3).trim())
		.filter((file) =>
			NEWS_PATHSPECS.some((spec) =>
				spec.endsWith('.ts') ? file === spec : file.startsWith(`${spec}/`) || file === spec,
			),
		);
}

function getBangkokDateKey() {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
}

function buildCommitMessage(files) {
	const articlePaths = files.filter(
		(file) => file.startsWith('src/content/news/') && file.endsWith('.md'),
	);
	const slugs = articlePaths.map((file) => file.split('/').pop().replace(/\.md$/, ''));

	if (slugs.length === 1) {
		return `feat(news): add ${slugs[0]}`;
	}
	if (slugs.length > 1) {
		return `feat(news): add ${slugs.length} articles for ${getBangkokDateKey()}\n\n${slugs.map((slug) => `- ${slug}`).join('\n')}`;
	}

	return `feat(news): update edition ${getBangkokDateKey()}`;
}

/** @returns {boolean} true if committed or pushed; false if nothing to do */
export function publishNewsChanges(options = {}) {
	const dryRun = options.dryRun ?? false;
	const noPush = options.noPush ?? false;

	if (!isGitRepo()) {
		console.error('Not a git repository — skip publish.');
		return false;
	}

	const files = listChangedNewsFiles();
	if (files.length === 0) {
		console.log('No news changes to publish.');
		return false;
	}

	const branch = runGit(['branch', '--show-current']);
	const message = buildCommitMessage(files);

	console.log(`Branch: ${branch}`);
	console.log(`Files (${files.length}):`);
	for (const file of files) console.log(`  ${file}`);
	console.log(`Commit: ${message.split('\n')[0]}`);

	if (dryRun) {
		console.log('\nDry run — no commit or push.');
		return false;
	}

	for (const spec of NEWS_PATHSPECS) {
		runGitInherit(['add', '--', spec]);
	}

	const staged = runGit(['diff', '--cached', '--name-only']);
	if (!staged) {
		console.log('Nothing staged after git add — skip.');
		return false;
	}

	execFileSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' });
	console.log('Committed news changes.');

	if (noPush) {
		console.log('Skipped push (--no-push).');
		return true;
	}

	execFileSync('git', ['push', 'origin', 'HEAD'], { cwd: ROOT, stdio: 'inherit' });
	console.log(`Pushed to origin/${branch}.`);
	return true;
}

function main() {
	const args = process.argv.slice(2);
	publishNewsChanges({
		dryRun: args.includes('--dry-run'),
		noPush: args.includes('--no-push'),
	});
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
	main();
}
