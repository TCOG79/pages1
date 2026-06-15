#!/usr/bin/env node
/**
 * Build without auto commit/push — for local dev and CI audit.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const result = spawnSync('npm', ['run', 'build'], {
	cwd: ROOT,
	stdio: 'inherit',
	shell: true,
	env: { ...process.env, PAGES1_SKIP_PUBLISH: '1' },
});

process.exit(result.status ?? 1);
