import { CandlesService, type CandleMarket } from '../market/candles.service.js'

const indices = [
	{
		key: 'egx30',
		symbol: '^CASE30',
		market: 'EGX' as CandleMarket,
		name: 'EGX30',
	},
	{
		key: 'sp500',
		symbol: '^GSPC',
		market: 'GLOBAL' as CandleMarket,
		name: 'S&P 500',
	},
	{
		key: 'nasdaq',
		symbol: '^IXIC',
		market: 'GLOBAL' as CandleMarket,
		name: 'Nasdaq',
	},
	{
		key: 'nikkei',
		symbol: '^N225',
		market: 'GLOBAL' as CandleMarket,
		name: 'Nikkei 225',
	},
	{
		key: 'dax',
		symbol: '^GDAXI',
		market: 'GLOBAL' as CandleMarket,
		name: 'DAX',
	},
	{
		key: 'tadawul',
		symbol: '^TASI',
		market: 'TASI' as CandleMarket,
		name: 'TASI',
	},
]
const daysByPeriod = { '1M': 22, '3M': 66, '6M': 132, '1Y': 250 } as const

export async function getGlobalComparison(
	period: keyof typeof daysByPeriod = '1Y',
) {
	const days = daysByPeriod[period] ?? daysByPeriod['1Y']
	const results = await Promise.all(
		indices.map(async (index) => {
			try {
				const candles = await CandlesService.getCandles(
					index.symbol,
					index.market,
					'1d',
					days + 10,
				)
				if (candles.candles.length < days) return null
				const prices = candles.candles.map((candle) => candle.close)
				const start = prices.at(-(days + 1)) ?? prices[0]
				const end = prices.at(-1) ?? start
				return {
					...index,
					current: end,
					changePercent: ((end - start) / start) * 100,
					source: candles.source,
					available: true,
				}
			} catch {
				return null
			}
		}),
	)
	const valid = results
		.filter((item): item is NonNullable<typeof item> => item !== null)
		.sort((a, b) => b.changePercent - a.changePercent)
	return {
		period,
		timestamp: new Date().toISOString(),
		data: valid,
		winner: valid[0]?.name ?? null,
		loser: valid.at(-1)?.name ?? null,
		egxRank: valid.findIndex((item) => item.key === 'egx30') + 1,
		available: valid.length > 0,
		disclaimer: 'تظهر فقط المؤشرات التي أعادت بيانات تاريخية موثوقة.',
	}
}
