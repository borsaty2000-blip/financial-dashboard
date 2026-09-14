import { CandlesService } from '../market/candles.service.js'
import { FundamentalsService } from '../market/fundamentals.service.js'
import { calculateIndicatorSnapshot } from '../analysis/indicators.service.js'

export const screenerPresets = {
	value: { peMax: 12, rsiMax: 45, volumeMin: 100000 },
	momentum: { rsiMin: 55, macd: 'bullish', smaTrend: 'above20' },
	dividend: { dividendYieldMin: 3 },
	oversold: { rsiMax: 30 },
	consensus: { consensusMin: 60 },
}
const universe = [
	'COMI',
	'ABUK',
	'ETEL',
	'SWDY',
	'TMGH',
	'ORAS',
	'MFPC',
	'EKHO',
	'HRHO',
	'EFIH',
	'CIEC',
	'SCRC',
	'2222',
	'1120',
	'1010',
]
function match(row: any, filters: Record<string, any>) {
	const checks: Array<[string, boolean]> = [
		['peMax', row.pe == null || row.pe <= Number(filters.peMax)],
		['peMin', row.pe == null || row.pe >= Number(filters.peMin)],
		['pbMax', row.pb == null || row.pb <= Number(filters.pbMax)],
		['epsMin', row.eps == null || row.eps >= Number(filters.epsMin)],
		['roeMin', row.roe == null || row.roe >= Number(filters.roeMin)],
		['rsiMax', row.rsi == null || row.rsi <= Number(filters.rsiMax)],
		['rsiMin', row.rsi == null || row.rsi >= Number(filters.rsiMin)],
		['sma20Above', row.sma20 == null || row.price >= row.sma20],
		['sma50Above', row.sma50 == null || row.price >= row.sma50],
		[
			'volumeMin',
			row.volume == null || row.volume >= Number(filters.volumeMin),
		],
		[
			'marketCapMin',
			row.marketCap == null || row.marketCap >= Number(filters.marketCapMin),
		],
		[
			'marketCapMax',
			row.marketCap == null || row.marketCap <= Number(filters.marketCapMax),
		],
		[
			'dividendYieldMin',
			row.dividendYield == null ||
				row.dividendYield >= Number(filters.dividendYieldMin),
		],
		['macd', !filters.macd || row.macd === filters.macd],
		[
			'consensusMin',
			row.consensusScore == null ||
				row.consensusScore >= Number(filters.consensusMin),
		],
	]
	return checks.every(([key, ok]) => filters[key] == null || ok)
}

export class ScreenerService {
	static async scan(filters: Record<string, any> = {}) {
		const rows = await Promise.all(
			universe.map(async (symbol) => {
				const candles = await CandlesService.getCandles(
					symbol,
					'EGX',
					'1d',
					250,
				).catch(() => ({
					candles: [] as any[],
					source: 'unavailable',
					freshness: 'cached' as const,
				}))
				const latest = candles.candles.at(-1)
				if (!latest) return null
				const indicator = calculateIndicatorSnapshot(symbol, candles.candles)
				const ratios = (await FundamentalsService.getKeyRatios(symbol).catch(
					() => ({}) as Record<string, unknown>,
				)) as Record<string, unknown>
				const row = {
					symbol,
					price: latest.close,
					changePercent: candles.candles.at(-2)
						? ((latest.close - candles.candles.at(-2)!.close) /
								candles.candles.at(-2)!.close) *
							100
						: null,
					volume: latest.volume,
					rsi: indicator.rsi.value,
					macd: indicator.macd.signal,
					sma20: indicator.sma20,
					sma50: indicator.sma50,
					pe: Number(ratios.peRatio ?? ratios.pe_ratio) || null,
					pb: Number(ratios.priceToBook ?? ratios.price_to_book) || null,
					eps: Number(ratios.eps ?? ratios.eps_ttm) || null,
					roe: Number(ratios.roe) || null,
					marketCap: Number(ratios.marketCap ?? ratios.market_cap) || null,
					dividendYield:
						Number(ratios.dividendYield ?? ratios.dividend_yield) || null,
					consensusScore: null,
					source: candles.source,
					freshness: candles.freshness,
				}
				return match(row, filters) ? row : null
			}),
		)
		return {
			filters,
			count: rows.filter(Boolean).length,
			data: rows.filter(Boolean),
			available: rows.some(Boolean),
		}
	}
}
