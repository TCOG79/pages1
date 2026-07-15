export type PaginationItem = number | 'ellipsis';

/**
 * Build a compact page range for archive pagination.
 * Examples (current / last):
 *   1 / 23  → 1 2 3 … 23
 *   12 / 23 → 1 … 11 12 13 … 23
 *   23 / 23 → 1 … 21 22 23
 */
export function getPaginationItems(
	currentPage: number,
	lastPage: number,
	{ siblingCount = 1, boundaryCount = 1 } = {},
): PaginationItem[] {
	if (lastPage < 1) return [];
	if (lastPage === 1) return [1];

	const current = Math.min(Math.max(1, currentPage), lastPage);
	const totalNumbers = siblingCount * 2 + boundaryCount * 2 + 3;

	if (lastPage <= totalNumbers) {
		return Array.from({ length: lastPage }, (_, i) => i + 1);
	}

	const startPages = range(1, boundaryCount);
	const endPages = range(lastPage - boundaryCount + 1, lastPage);

	const siblingsStart = Math.max(
		Math.min(current - siblingCount, lastPage - boundaryCount - siblingCount * 2 - 1),
		boundaryCount + 2,
	);
	const siblingsEnd = Math.min(
		Math.max(current + siblingCount, boundaryCount + siblingCount * 2 + 2),
		endPages[0] - 2,
	);

	const items: PaginationItem[] = [...startPages];

	if (siblingsStart > boundaryCount + 2) {
		items.push('ellipsis');
	} else if (boundaryCount + 1 < siblingsStart) {
		items.push(boundaryCount + 1);
	}

	items.push(...range(siblingsStart, siblingsEnd));

	if (siblingsEnd < lastPage - boundaryCount - 1) {
		items.push('ellipsis');
	} else if (siblingsEnd === lastPage - boundaryCount - 1) {
		items.push(siblingsEnd + 1);
	}

	items.push(...endPages);

	return items;
}

function range(start: number, end: number): number[] {
	const pages: number[] = [];
	for (let page = start; page <= end; page += 1) {
		pages.push(page);
	}
	return pages;
}
