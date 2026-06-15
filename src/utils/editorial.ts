import type { CollectionEntry } from 'astro:content';
import { NEWS_CATEGORIES, type NewsCategory } from '../config/categories';
import { isSameCalendarDay } from './format';

export type EditionResult = {
	articles: CollectionEntry<'news'>[];
	editionDate: Date;
	isToday: boolean;
};

/** ข่าวฉบับวัน — หน้าแรกแสดงเฉพาะข่าวที่ publishedAt ตรงวันอ้างอิง (Asia/Bangkok) */
export function getEditionArticles(
	allNews: CollectionEntry<'news'>[],
	referenceDate = new Date(),
): EditionResult {
	const todayArticles = allNews.filter((article) =>
		isSameCalendarDay(article.data.publishedAt, referenceDate),
	);

	return {
		articles: todayArticles,
		editionDate: referenceDate,
		isToday: todayArticles.length > 0,
	};
}

/** เลือกข่าวเด่น 1 เรื่องต่อหมวด — featured ก่อน แล้วเรียงตามลำดับในวันนั้น */
export function pickCategoryHighlights(
	articles: CollectionEntry<'news'>[],
	excludeIds: Set<string> = new Set(),
): CollectionEntry<'news'>[] {
	const picks: CollectionEntry<'news'>[] = [];

	for (const category of NEWS_CATEGORIES) {
		const inCategory = articles.filter(
			(article) => article.data.category === category && !excludeIds.has(article.id),
		);
		if (inCategory.length === 0) continue;

		const featured = inCategory.find((article) => article.data.featured);
		picks.push(featured ?? inCategory[0]);
	}

	return picks;
}

export function categoryLabel(category: NewsCategory): string {
	return category;
}
