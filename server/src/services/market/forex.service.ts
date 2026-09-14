const currencies = [
	'USD',
	'EUR',
	'GBP',
	'JPY',
	'CHF',
	'CAD',
	'AUD',
	'NZD',
	'CNY',
	'SAR',
	'AED',
	'EGP',
	'TRY',
	'ZAR',
	'INR',
	'HKD',
	'SGD',
	'SEK',
	'NOK',
	'DKK',
	'PLN',
	'BRL',
	'MXN',
	'KRW',
	'QAR',
	'KWD',
	'BHD',
	'OMR',
	'JOD',
	'MAD',
]
const majorPairs = [
	'EUR/USD',
	'GBP/USD',
	'USD/JPY',
	'USD/CHF',
	'AUD/USD',
	'USD/CAD',
	'NZD/USD',
]
const pairs = currencies
	.flatMap((from, index) =>
		currencies.slice(index + 1).map((to) => `${from}/${to}`),
	)
	.slice(0, 60)
async function json(url: string) {
	const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	return response.json() as Promise<any>
}
export class ForexService {
	static getCurrencyPairs() {
		return pairs.map((pair) => ({
			pair,
			base: pair.slice(0, 3),
			quote: pair.slice(4),
			category: majorPairs.includes(pair) ? 'major' : 'cross',
		}))
	}
	static getMajorPairs() {
		return majorPairs
	}
	static async getQuote(pair: string) {
		const [from, to] = pair.toUpperCase().replace('-', '/').split('/')
		if (!from || !to) throw new Error('Invalid currency pair')
		try {
			const data = await json(
				`https://api.frankfurter.app/latest?from=${from}&to=${to}`,
			)
			const rate = Number(data?.rates?.[to])
			if (!Number.isFinite(rate)) throw new Error('Rate unavailable')
			return {
				pair: `${from}/${to}`,
				rate,
				changePercent: null,
				source: 'Frankfurter',
				updatedAt: data.date,
				available: true,
			}
		} catch {
			const key = process.env.TWELVE_DATA_API_KEY
			if (!key)
				return {
					pair: `${from}/${to}`,
					rate: null,
					changePercent: null,
					source: 'unavailable',
					updatedAt: null,
					available: false,
				}
			const data = await json(
				`https://api.twelvedata.com/quote?symbol=${from}/${to}&apikey=${encodeURIComponent(key)}`,
			)
			const rate = Number(data?.close)
			return {
				pair: `${from}/${to}`,
				rate: Number.isFinite(rate) ? rate : null,
				changePercent: Number(data?.percent_change) || null,
				source: 'Twelve Data Pro',
				updatedAt: data?.datetime ?? null,
				available: Number.isFinite(rate),
			}
		}
	}
	static async getHistorical(pair: string, period = '1M') {
		const [from, to] = pair.toUpperCase().split('/')
		const days = period === '1Y' ? 365 : period === '1W' ? 7 : 30
		const end = new Date()
		const start = new Date(Date.now() - days * 86400000)
		try {
			const data = await json(
				`https://api.frankfurter.app/${start.toISOString().slice(0, 10)}..${end.toISOString().slice(0, 10)}?from=${from}&to=${to}`,
			)
			return {
				pair,
				points: Object.entries(data?.rates ?? {}).map(
					([date, rates]: [string, any]) => ({ date, rate: rates[to] }),
				),
				available: true,
				source: 'Frankfurter',
			}
		} catch {
			return { pair, points: [], available: false, source: 'unavailable' }
		}
	}
}
