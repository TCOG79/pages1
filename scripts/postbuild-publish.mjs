#!/usr/bin/env node
/**
 * postbuild hook — auto commit + push after a successful `npm run build`.
 * Set PAGES1_SKIP_PUBLISH=1 to skip (used by `npm run build:only`).
 */

import { publishDeployChanges } from './publish-news.mjs';

if (process.env.PAGES1_SKIP_PUBLISH === '1') {
	console.log('Skip publish (PAGES1_SKIP_PUBLISH=1).');
	process.exit(0);
}

publishDeployChanges();
