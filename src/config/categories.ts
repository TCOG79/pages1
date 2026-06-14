export const NEWS_CATEGORIES = [
	'การเมือง',
	'เศรษฐกิจ',
	'กีฬา',
	'บันเทิง',
	'ไอที/เทคโนโลยี',
	'ยานยนต์',
	'หวยไทย',
] as const;

export type NewsCategory = (typeof NEWS_CATEGORIES)[number];

export const NEWS_CATEGORIES_LABEL = NEWS_CATEGORIES.join(' ');
