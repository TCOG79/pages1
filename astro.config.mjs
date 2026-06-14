// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { unified } from '@astrojs/markdown-remark';
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
	markdown: {
		syntaxHighlight: false,
		processor: unified({
			remarkRehype: {
				allowDangerousHtml: false,
			},
		}),
	},
	security: {
		csp: {
			directives: [
				"default-src 'self'",
				"img-src 'self' data: https:",
				"font-src 'self'",
				"connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://www.googletagmanager.com",
				"frame-ancestors 'none'",
				"base-uri 'self'",
				"form-action 'self'",
			],
			scriptDirective: {
				resources: ['https://www.googletagmanager.com'],
			},
		},
	},
});
