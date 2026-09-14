import { methodologies, screenStock } from './halal.service.js'

export async function screenWith5Methodologies(symbol: string) {
	const normalized = symbol.toUpperCase()
	const results = await Promise.all(
		methodologies.map(async (methodology) => {
			try {
				return {
					methodology,
					available: true,
					result: await screenStock(normalized, methodology),
				}
			} catch (error) {
				return {
					methodology,
					available: false,
					error: error instanceof Error ? error.message : 'غير متاح',
				}
			}
		}),
	)
	return {
		symbol: normalized,
		methodologies: results,
		availableCount: results.filter((item) => item.available).length,
		disclaimer:
			'نتيجة فحص تعليمية وليست فتوى شرعية. راجع هيئة شرعية مختصة قبل اتخاذ قرار.',
	}
}

export function dividendPurification(
	symbol: string,
	dividends: number | number[],
	purificationRate = 0,
) {
	const total = Array.isArray(dividends)
		? dividends.reduce((sum, value) => sum + Number(value || 0), 0)
		: Number(dividends || 0)
	const rate = Math.max(0, Math.min(1, purificationRate))
	return {
		symbol: symbol.toUpperCase(),
		dividends: total,
		purificationRate: rate,
		amountToPurify: total * rate,
		available: true,
	}
}

export async function generateShariahCertificate(symbol: string) {
	const screening = await screenWith5Methodologies(symbol)
	return {
		certificateId: `BRS-${screening.symbol}-${Date.now()}`,
		issuedAt: new Date().toISOString(),
		...screening,
		certificateText: `شهادة فحص شرعي تعليمية للسهم ${screening.symbol}`,
	}
}
