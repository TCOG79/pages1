import { SITE_URL } from '../config/site';

export function absoluteUrl(path: string, base = SITE_URL): string {
	if (path.startsWith('http://') || path.startsWith('https://')) {
		return path;
	}

	const normalized = path.startsWith('/') ? path : `/${path}`;
	return new URL(normalized, base).href;
}
