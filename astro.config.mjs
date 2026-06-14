// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { newsRedirects } from './src/config/news-redirects.ts';

/** sync กับ src/config/site.ts */
const SITE_URL = process.env.PUBLIC_SITE_URL ?? 'https://hna1.example.com';

// https://astro.build/config
export default defineConfig({
	site: SITE_URL,
	redirects: newsRedirects,
	prefetch: true,
	devToolbar: {
		enabled: false,
	},
	integrations: [sitemap()],
});
