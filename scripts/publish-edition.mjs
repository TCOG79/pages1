#!/usr/bin/env node
/**
 * Build site then auto commit + push news files (used after adding/updating articles).
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { publishNewsChanges } from './publish-news.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const build = spawnSync('npm', ['run', 'build'], {
	cwd: ROOT,
	stdio: 'inherit',
	shell: true,
});

if (build.status !== 0) {
	process.exit(build.status ?? 1);
}

const published = publishNewsChanges();
process.exit(published ? 0 : 0);
