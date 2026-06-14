export const SITE_NAME = 'หน้า1';

/** เปลี่ยนเป็นโดเมนจริงตอน deploy หรือตั้ง PUBLIC_SITE_URL ใน .env */
export const SITE_URL = (
	import.meta.env.PUBLIC_SITE_URL ?? 'https://hna1.example.com'
).replace(/\/$/, '');

export const DEFAULT_OG_IMAGE = '/images/logo.png';

/** ตั้ง PUBLIC_GA4_ID ใน .env เพื่อเปิด Google Analytics 4 */
export const GA4_ID = import.meta.env.PUBLIC_GA4_ID ?? '';
