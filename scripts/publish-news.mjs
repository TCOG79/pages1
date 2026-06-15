#!/usr/bin/env node
/**
 * Commit and push deployable changes.
 *
 * Usage:
 *   node scripts/publish-news.mjs              # news paths only → commit → push
 *   node scripts/publish-news.mjs --deploy     # src + news assets + .cursor → push
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

/** Paths included when publishing after a successful build */
const DEPLOY_PATHSPECS = [
	'src',
	'public/images/news',
	'public/audio/news',
	'.cursor',
	'scripts',
	'package.json',
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

function matchesPathspec(file, pathspecs) {
	return pathspecs.some((spec) =>
		spec.endsWith('.ts') || spec.endsWith('.json')
			? file === spec
			: file.startsWith(`${spec}/`) || file === spec,
	);
}

function listChangedFiles(pathspecs) {
	const output = runGit(['status', '--porcelain', '--untracked-files=all']);
	if (!output) return [];

	return output
		.split('\n')
		.filter(Boolean)
		.map((line) => line.slice(3).trim())
		.filter((file) => matchesPathspec(file, pathspecs));
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

	const hasSiteChanges = files.some(
		(file) => file.startsWith('src/') && !file.startsWith('src/content/news/'),
	);
	if (hasSiteChanges) {
		return `fix: update site for edition ${getBangkokDateKey()}`;
	}

	return `feat(news): update edition ${getBangkokDateKey()}`;
}

function publishChanges(pathspecs, options = {}) {
	const dryRun = options.dryRun ?? false;
	const noPush = options.noPush ?? false;
	const label = options.label ?? 'changes';

	if (!isGitRepo()) {
		console.error('Not a git repository — skip publish.');
		return false;
	}

	const files = listChangedFiles(pathspecs);
	if (files.length === 0) {
		console.log(`No ${label} to publish.`);
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

	for (const spec of pathspecs) {
		runGitInherit(['add', '--', spec]);
	}

	const staged = runGit(['diff', '--cached', '--name-only']);
	if (!staged) {
		console.log('Nothing staged after git add — skip.');
		return false;
	}

	execFileSync('git', ['commit', '-m', message], { cwd: ROOT, stdio: 'inherit' });
	console.log(`Committed ${label}.`);

	if (noPush) {
		console.log('Skipped push (--no-push).');
		return true;
	}

	execFileSync('git', ['push', 'origin', 'HEAD'], { cwd: ROOT, stdio: 'inherit' });
	console.log(`Pushed to origin/${branch}.`);
	return true;
}

/** @returns {boolean} true if committed or pushed; false if nothing to do */
export function publishNewsChanges(options = {}) {
	return publishChanges(NEWS_PATHSPECS, { ...options, label: 'news changes' });
}

/** postbuild — commit + push all deployable paths after successful build */
export function publishDeployChanges(options = {}) {
	return publishChanges(DEPLOY_PATHSPECS, { ...options, label: 'deploy changes' });
}

function main() {
	const args = process.argv.slice(2);
	const publish = args.includes('--deploy') ? publishDeployChanges : publishNewsChanges;
	publish({
		dryRun: args.includes('--dry-run'),
		noPush: args.includes('--no-push'),
	});
}

const isMain =
	process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMain) {
	main();
}
