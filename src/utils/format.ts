const thaiDateFormatter = new Intl.DateTimeFormat('th-TH', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

const bangkokThaiDateFormatter = new Intl.DateTimeFormat('th-TH', {
	timeZone: 'Asia/Bangkok',
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
});

const thaiShortDateFormatter = new Intl.DateTimeFormat('th-TH', {
	day: 'numeric',
	month: 'short',
	year: 'numeric',
});

export function formatThaiDate(date: Date): string {
	return thaiDateFormatter.format(date);
}

/** วันที่ภาษาไทยตามปฏิทิน Asia/Bangkok — ใช้ masthead / วันที่ปัจจุบัน */
export function formatThaiDateBangkok(date: Date = new Date()): string {
	return bangkokThaiDateFormatter.format(date);
}

export function formatThaiShortDate(date: Date): string {
	return thaiShortDateFormatter.format(date);
}

const calendarDateFormatter = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Asia/Bangkok',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
});

export function getCalendarDateKey(date: Date, timeZone = 'Asia/Bangkok'): string {
	if (timeZone === 'Asia/Bangkok') {
		return calendarDateFormatter.format(date);
	}

	return new Intl.DateTimeFormat('en-CA', {
		timeZone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).format(date);
}

export function isSameCalendarDay(
	a: Date,
	b: Date,
	timeZone = 'Asia/Bangkok',
): boolean {
	return getCalendarDateKey(a, timeZone) === getCalendarDateKey(b, timeZone);
}
