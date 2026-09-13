export type Candle = {
	date: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}

export type CandleMarket = 'EGX' | 'TASI' | 'GLOBAL'
export type CandlesResponse = {
	symbol: string
	market: CandleMarket
	interval: string
	candles: Candle[]
	source: string
	fetched_at: string
	count: number
}

type CacheEntry = { expires: number; value: CandlesResponse }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 5 * 60 * 1000

const validCandle = (candle: Candle) =>
	[candle.open, candle.high, candle.low, candle.close].every(
		(value) => Number.isFinite(value) && value > 0,
	) &&
	candle.high >= Math.max(candle.open, candle.close) &&
	candle.low <= Math.min(candle.open, candle.close)
const response = (
	symbol: string,
	market: CandleMarket,
	interval: string,
	candles: Candle[],
	source: string,
): CandlesResponse => ({
	symbol,
	market,
	interval,
	candles,
	source,
	fetched_at: new Date().toISOString(),
	count: candles.length,
})

async function requestJson(url: string, init?: RequestInit) {
	const result = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(10000),
	})
	if (!result.ok) throw new Error(`HTTP ${result.status}`)
	return result.json() as Promise<any>
}

export class CandlesService {
	static async getCandles(
		symbol: string,
		market: CandleMarket = 'EGX',
		interval = '1d',
		days = 250,
	): Promise<CandlesResponse> {
		const normalized = symbol.trim().toUpperCase()
		const cacheKey = `candles:${market}:${normalized}:${interval}:${days}`
		const cached = cache.get(cacheKey)
		if (cached && cached.expires > Date.now()) return cached.value
		const sources: Array<() => Promise<CandlesResponse>> = [
			() => this.fetchYahoo(normalized, market, interval, days),
			() => this.fetchStooq(normalized, market, interval, days),
			() => this.fetchTwelveData(normalized, market, interval, days),
			() => this.fetchFinnhub(normalized, market, days),
		]
		for (const fetcher of sources) {
			try {
				const value = await fetcher()
				if (value.candles.length) {
					cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL })
					return value
				}
			} catch (error) {
				console.warn(
					'Candle source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		return response(normalized, market, interval, [], 'unavailable')
	}

	private static async fetchYahoo(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		const suffix = market === 'EGX' ? '.CA' : market === 'TASI' ? '.SR' : ''
		const range = interval === '1wk' ? '5y' : interval === '1mo' ? '10y' : '1y'
		const yahooInterval = interval === '1d' ? '1d' : interval
		const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(`${symbol}${suffix}`)}?interval=${yahooInterval}&range=${range}`
		const data = await requestJson(url)
		const result = data?.chart?.result?.[0]
		if (!result?.timestamp || !result.indicators?.quote?.[0])
			throw new Error('No Yahoo data')
		const quote = result.indicators.quote[0]
		const candles = result.timestamp
			.map((timestamp: number, index: number) => ({
				date: new Date(timestamp * 1000).toISOString().slice(0, 10),
				open: Number(quote.open[index]),
				high: Number(quote.high[index]),
				low: Number(quote.low[index]),
				close: Number(quote.close[index]),
				volume: Number(quote.volume?.[index] ?? 0),
			}))
			.filter(validCandle)
			.slice(-days)
		return response(symbol, market, interval, candles, 'Yahoo Finance')
	}

	private static async fetchStooq(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		if (market !== 'EGX' || interval !== '1d')
			throw new Error('Stooq adapter supports EGX daily data only')
		const csv = await fetch(
			`https://stooq.com/q/d/l/?s=${encodeURIComponent(symbol.toLowerCase())}.eg&i=d`,
			{ signal: AbortSignal.timeout(10000) },
		).then((result) => {
			if (!result.ok) throw new Error(`HTTP ${result.status}`)
			return result.text()
		})
		const candles = csv
			.trim()
			.split('\n')
			.slice(1)
			.map((line) => {
				const [date, open, high, low, close, volume] = line.split(',')
				return {
					date,
					open: Number(open),
					high: Number(high),
					low: Number(low),
					close: Number(close),
					volume: Number(volume || 0),
				}
			})
			.filter(validCandle)
			.slice(-days)
		return response(symbol, market, interval, candles, 'Stooq')
	}

	private static async fetchTwelveData(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		const apiKey = process.env.TWELVE_DATA_API_KEY
		if (!apiKey) throw new Error('TWELVE_DATA_API_KEY is not configured')
		const exchange =
			market === 'EGX' ? 'EGX' : market === 'TASI' ? 'TADAWUL' : ''
		const params = new URLSearchParams({
			symbol,
			interval: interval === '1d' ? '1day' : interval,
			outputsize: String(days),
			apikey: apiKey,
		})
		if (exchange) params.set('exchange', exchange)
		const data = await requestJson(
			`https://api.twelvedata.com/time_series?${params}`,
		)
		if (!Array.isArray(data?.values))
			throw new Error(data?.message ?? 'No Twelve Data values')
		const candles = data.values
			.map((value: any) => ({
				date: String(value.datetime),
				open: Number(value.open),
				high: Number(value.high),
				low: Number(value.low),
				close: Number(value.close),
				volume: Number(value.volume ?? 0),
			}))
			.filter(validCandle)
			.reverse()
		return response(symbol, market, interval, candles, 'Twelve Data')
	}

	private static async fetchFinnhub(
		symbol: string,
		market: CandleMarket,
		days: number,
	) {
		const apiKey = process.env.FINNHUB_API_KEY
		if (!apiKey) throw new Error('FINNHUB_API_KEY is not configured')
		const suffix = market === 'TASI' ? '.SR' : ''
		const to = Math.floor(Date.now() / 1000)
		const from = to - days * 86400
		const params = new URLSearchParams({
			symbol: `${symbol}${suffix}`,
			resolution: 'D',
			from: String(from),
			to: String(to),
			token: apiKey,
		})
		const data = await requestJson(
			`https://finnhub.io/api/v1/stock/candle?${params}`,
		)
		if (data?.s !== 'ok' || !Array.isArray(data?.c))
			throw new Error('No Finnhub data')
		const candles = data.t
			.map((timestamp: number, index: number) => ({
				date: new Date(timestamp * 1000).toISOString().slice(0, 10),
				open: Number(data.o[index]),
				high: Number(data.h[index]),
				low: Number(data.l[index]),
				close: Number(data.c[index]),
				volume: Number(data.v?.[index] ?? 0),
			}))
			.filter(validCandle)
		return response(symbol, market, '1d', candles, 'Finnhub')
	}
}
