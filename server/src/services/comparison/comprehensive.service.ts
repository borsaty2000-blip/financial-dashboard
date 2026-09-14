import { prisma } from '../../lib/prisma.js'
import { CandlesService } from '../market/candles.service.js'
import { FundamentalsService } from '../market/fundamentals.service.js'
const sectors: Record<string, string[]> = {
	بنوك: ['COMI', 'HRHO'],
	أسمدة: ['ABUK', 'MFPC'],
	اتصالات: ['ETEL'],
	عقارات: ['TMGH'],
	صناعات: ['SWDY', 'CIEC'],
	بتروكيماويات: ['EKHO'],
}
const periodDays: Record<string, number> = {
	YTD: 270,
	'1Y': 365,
	'3Y': 1095,
	'5Y': 1825,
	'10Y': 3650,
}
async function performance(symbol: string, days: number) {
	const data = await CandlesService.getCandles(
		symbol,
		'EGX',
		'1d',
		Math.min(days, 2500),
	)
	const first = data.candles.at(0)
	const last = data.candles.at(-1)
	return {
		symbol,
		returnPercent:
			first && last ? ((last.close - first.close) / first.close) * 100 : null,
		price: last?.close ?? null,
		source: data.source,
		available: Boolean(first && last),
	}
}
export class ComprehensiveComparisonService {
	static async sectors() {
		const data = await Promise.all(
			Object.entries(sectors).map(async ([sector, symbols]) => {
				const rows = await Promise.all(
					symbols.map((symbol) => performance(symbol, 365)),
				)
				const available = rows.filter((row) => row.available)
				const ratios = await Promise.all(
					symbols.map((symbol) =>
						FundamentalsService.getKeyRatios(symbol).catch(
							() => ({}) as Record<string, unknown>,
						),
					),
				)
				const pe = ratios
					.map((item) => Number(item.peRatio))
					.filter(Number.isFinite)
				return {
					sector,
					companyCount: symbols.length,
					averagePE: pe.length
						? pe.reduce((a, b) => a + b, 0) / pe.length
						: null,
					performancePercent: available.length
						? available.reduce(
								(sum, row) => sum + (row.returnPercent ?? 0),
								0,
							) / available.length
						: null,
					companies: rows,
				}
			}),
		)
		return {
			data,
			bestSector:
				data
					.filter((item) => item.performancePercent != null)
					.sort(
						(a, b) =>
							(b.performancePercent ?? -Infinity) -
							(a.performancePercent ?? -Infinity),
					)[0]?.sector ?? null,
		}
	}
	static async periods() {
		const data = await Promise.all(
			Object.entries(periodDays).map(async ([period, days]) => ({
				period,
				...(await performance('^CASE30', days)),
			})),
		)
		return { data, available: data.some((item) => item.available) }
	}
	static async watchlist(userId: string) {
		const list = await prisma.watchlist.findFirst({
			where: { userId },
			include: { items: true },
		})
		const symbols = list?.items.map((item) => item.symbol) ?? []
		const data = await Promise.all(
			symbols.map((symbol) => performance(symbol, 365)),
		)
		return {
			symbols,
			data: data.sort(
				(a, b) =>
					(b.returnPercent ?? -Infinity) - (a.returnPercent ?? -Infinity),
			),
			available: data.length > 0,
		}
	}
}
