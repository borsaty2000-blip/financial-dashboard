import { prisma } from '../../lib/prisma.js'

export const marketCatalog = [
	{
		code: 'EGX',
		name: 'البورصة المصرية',
		nameEn: 'Egyptian Exchange',
		country: 'EG',
		currency: 'EGP',
		timezone: 'Africa/Cairo',
		regulator: 'FRA',
		active: true,
	},
	{
		code: 'TASI',
		name: 'السوق المالية السعودية',
		nameEn: 'Saudi Exchange',
		country: 'SA',
		currency: 'SAR',
		timezone: 'Asia/Riyadh',
		regulator: 'CMA',
		active: true,
	},
	{
		code: 'DFM',
		name: 'سوق دبي المالي',
		nameEn: 'Dubai Financial Market',
		country: 'AE',
		currency: 'AED',
		timezone: 'Asia/Dubai',
		regulator: 'SCA',
		active: false,
	},
	{
		code: 'ADX',
		name: 'سوق أبوظبي للأوراق المالية',
		nameEn: 'Abu Dhabi Securities Exchange',
		country: 'AE',
		currency: 'AED',
		timezone: 'Asia/Dubai',
		regulator: 'SCA',
		active: false,
	},
	{
		code: 'QSE',
		name: 'بورصة قطر',
		nameEn: 'Qatar Stock Exchange',
		country: 'QA',
		currency: 'QAR',
		timezone: 'Asia/Qatar',
		regulator: 'QFMA',
		active: false,
	},
]
export const currencyCatalog = [
	{ code: 'EGP', name: 'الجنيه المصري', symbol: 'ج.م' },
	{ code: 'SAR', name: 'الريال السعودي', symbol: 'ر.س' },
	{ code: 'AED', name: 'الدرهم الإماراتي', symbol: 'د.إ' },
	{ code: 'QAR', name: 'الريال القطري', symbol: 'ر.ق' },
	{ code: 'USD', name: 'الدولار الأمريكي', symbol: '$' },
	{ code: 'EUR', name: 'اليورو', symbol: '€' },
]

export async function listMarkets() {
	try {
		const rows = await prisma.market.findMany({ orderBy: { code: 'asc' } })
		return rows.length ? rows : marketCatalog
	} catch {
		return marketCatalog
	}
}
export async function listCurrencies() {
	try {
		const rows = await prisma.currency.findMany({
			where: { isActive: true },
			orderBy: { code: 'asc' },
		})
		return rows.length ? rows : currencyCatalog
	} catch {
		return currencyCatalog
	}
}
export function localSettings(country?: string) {
	const item =
		marketCatalog.find((market) => market.country === country) ??
		marketCatalog[0]
	return {
		country: item.country,
		market: item.code,
		currency: item.currency,
		locale:
			item.country === 'SA'
				? 'ar-SA'
				: item.country === 'AE'
					? 'ar-AE'
					: 'ar-EG',
		regulator: item.regulator,
	}
}
export function formatPrice(
	amount: number,
	currency: string,
	locale = 'ar-EG',
) {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		maximumFractionDigits: 2,
	}).format(amount)
}
