import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { NEWS_CATEGORIES } from './config/categories';

const imageRights = z.enum(['source_thumbnail', 'press_release', 'placeholder']);

const news = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
	schema: z
		.object({
			title: z.string(),
			excerpt: z.string(),
			category: z.enum(NEWS_CATEGORIES),
			featured: z.boolean().default(false),
			image: z.string().refine((v) => v.startsWith('/images/'), {
				message: 'image must be a local path under /images/',
			}),
			imageCredit: z.string().optional(),
			imageSourceUrl: z.string().url().optional(),
			imageRights: imageRights.default('source_thumbnail'),
			sourceName: z.string(),
			sourceUrl: z.string().url(),
			publishedAt: z.coerce.date(),
			author: z.string(),
			originalAuthor: z.string().optional(),
			rightsModel: z.literal('excerpt_only').default('excerpt_only'),
		})
		.superRefine((data, ctx) => {
			if (data.imageRights !== 'placeholder' && !data.imageCredit) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: 'imageCredit is required when imageRights is not placeholder',
					path: ['imageCredit'],
				});
			}
		}),
});

export const collections = { news };
