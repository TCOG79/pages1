import { getCalendarDateKey } from './format';

export function getNewsFolderSegments(date: Date, timeZone = 'Asia/Bangkok'): [string, string, string] {
	const [year, month, day] = getCalendarDateKey(date, timeZone).split('-');
	return [year, month, day];
}

export function getNewsContentRelativePath(
	date: Date,
	slug: string,
	timeZone = 'Asia/Bangkok',
): string {
	const [year, month, day] = getNewsFolderSegments(date, timeZone);
	return `${year}/${month}/${day}/${slug}`;
}

export function getNewsFilePath(date: Date, slug: string, timeZone = 'Asia/Bangkok'): string {
	return `src/content/news/${getNewsContentRelativePath(date, slug, timeZone)}.md`;
}

export function getNewsUrlPath(date: Date, slug: string, timeZone = 'Asia/Bangkok'): string {
	return `/news/${getNewsContentRelativePath(date, slug, timeZone)}/`;
}

export function getNewsAudioUrlPath(articleId: string): string {
	return `/audio/news/${articleId}.mp3`;
}
