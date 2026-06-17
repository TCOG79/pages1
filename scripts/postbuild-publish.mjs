#!/usr/bin/env node
/**
 * postbuild hook — auto commit + push after a successful `npm run build`.
 * Set PAGES1_SKIP_PUBLISH=1 to skip (used by `npm run build:only`).
 * Skipped automatically on Vercel and other CI (no git push credentials).
 */

import { publishDeployChanges } from './publish-news.mjs';

function getSkipPublishReason() {
	if (process.env.PAGES1_SKIP_PUBLISH === '1') return 'PAGES1_SKIP_PUBLISH=1';
	if (process.env.VERCEL) return 'Vercel deploy';
	if (process.env.CI) return 'CI environment';
	return null;
}

const skipReason = getSkipPublishReason();
if (skipReason) {
	console.log(`Skip publish (${skipReason}).`);
	process.exit(0);
}

publishDeployChanges();
