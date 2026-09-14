import { prisma } from '../../lib/prisma.js'
import { resolveEgyptSymbol } from './twelve-data.adapter.js'

export type Candle = {
	date: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}
export type CandleMarket = 'EGX' | 'TASI' | 'GLOBAL'
export type Freshness = 'live' | 'delayed' | 'cached'
export type CandlesResponse = {
	symbol: string
	market: CandleMarket
	interval: string
	candles: Candle[]
	source: string
	fetched_at: string
	count: number
	freshness: Freshness
	delayedByMinutes: number | null
}
type CacheEntry = { expires: number; value: CandlesResponse }
const cache = new Map<string, CacheEntry>()
const CACHE_TTL = 60_000

const validCandle = (candle: Candle) =>
	[candle.open, candle.high, candle.low, candle.close].every(
		(value) => Number.isFinite(value) && value > 0,
	) &&
	candle.high >= Math.max(candle.open, candle.close) &&
	candle.low <= Math.min(candle.open, candle.close)
const freshnessFor = (
	source: string,
	candles: Candle[],
): { freshness: Freshness; delayedByMinutes: number | null } => {
	if (source === 'database-cache')
		return { freshness: 'cached', delayedByMinutes: null }
	if (
		source === 'Yahoo Finance' ||
		source === 'Stooq' ||
		source === 'SAHMK historical' ||
		(source === 'Twelve Data' && process.env.TWELVE_DATA_REALTIME !== 'true')
	)
		return { freshness: 'delayed', delayedByMinutes: 15 }
	const date = candles.at(-1)?.date
	const age = date
		? Math.max(0, Math.round((Date.now() - new Date(date).getTime()) / 60_000))
		: 0
	return {
		freshness: age <= 5 ? 'live' : 'delayed',
		delayedByMinutes: age > 5 ? age : null,
	}
}
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
	...freshnessFor(source, candles),
})

async function requestJson(url: string, init?: RequestInit) {
	const result = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(10000),
	})
	if (!result.ok) throw new Error(`HTTP ${result.status}`)
	return result.json() as Promise<any>
}

async function persist(
	symbol: string,
	market: CandleMarket,
	interval: string,
	source: string,
	candles: Candle[],
) {
	if (!candles.length) return
	await prisma.marketCandle
		.createMany({
			data: candles.map((candle) => ({
				symbol,
				market,
				interval,
				date: new Date(`${candle.date.slice(0, 10)}T00:00:00.000Z`),
				open: candle.open,
				high: candle.high,
				low: candle.low,
				close: candle.close,
				volume: candle.volume,
				source,
			})),
			skipDuplicates: true,
		})
		.catch(() => undefined)
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
		if (cached && cached.expires > Date.now())
			return { ...cached.value, freshness: 'cached' }
		const sources: Array<() => Promise<CandlesResponse>> = [
			() => this.fetchTwelveData(normalized, market, interval, days),
			() => this.fetchSahmk(normalized, market, interval, days),
			() => this.fetchPolygon(normalized, market, days),
			() => this.fetchYahoo(normalized, market, interval, days),
			() => this.fetchStooq(normalized, market, interval, days),
			() => this.fetchFinnhub(normalized, market, days),
		]
		for (const fetcher of sources) {
			try {
				const value = await fetcher()
				if (value.candles.length) {
					cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL })
					void persist(
						normalized,
						market,
						interval,
						value.source,
						value.candles,
					)
					return value
				}
			} catch (error) {
				console.warn(
					'Candle source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		const stored = await prisma.marketCandle
			.findMany({
				where: { symbol: normalized, market, interval },
				orderBy: { date: 'desc' },
				take: days,
			})
			.catch(() => [])
		if (stored.length) {
			const candles = stored.reverse().map((item) => ({
				date: item.date.toISOString().slice(0, 10),
				open: item.open,
				high: item.high,
				low: item.low,
				close: item.close,
				volume: item.volume,
			}))
			const value = response(
				normalized,
				market,
				interval,
				candles,
				'database-cache',
			)
			cache.set(cacheKey, { value, expires: Date.now() + CACHE_TTL })
			return value
		}
		return response(normalized, market, interval, [], 'unavailable')
	}

	private static async fetchTwelveData(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		const apiKey = process.env.TWELVE_DATA_API_KEY
		if (!apiKey) throw new Error('TWELVE_DATA_API_KEY is not configured')
		const providerSymbol =
			market === 'EGX' ? await resolveEgyptSymbol(symbol) : symbol
		const params = new URLSearchParams({
			symbol: providerSymbol,
			interval: interval === '1d' ? '1day' : interval,
			outputsize: String(days),
			apikey: apiKey,
		})
		const exchange =
			market === 'EGX' ? 'EGX' : market === 'TASI' ? 'TADAWUL' : ''
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

	private static async fetchSahmk(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		if (market !== 'TASI') throw new Error('SAHMK supports TASI only')
		const key = process.env.SAHMK_API_KEY
		if (!key) throw new Error('SAHMK_API_KEY is not configured')
		const to = new Date().toISOString().slice(0, 10)
		const from = new Date(Date.now() - days * 86400000)
			.toISOString()
			.slice(0, 10)
		const params = new URLSearchParams({
			interval: interval === '1d' ? '1d' : interval,
			from,
			to,
			limit: String(Math.min(days, 2000)),
		})
		const data = await requestJson(
			`https://api.sahmk.sa/api/v1/historical/${encodeURIComponent(symbol)}/?${params}`,
			{ headers: { 'X-API-Key': key } },
		)
		const candles = (data?.data ?? [])
			.map((value: any) => ({
				date: String(value.date),
				open: Number(value.open),
				high: Number(value.high),
				low: Number(value.low),
				close: Number(value.close),
				volume: Number(value.volume ?? 0),
			}))
			.filter(validCandle)
		if (!candles.length) throw new Error('No SAHMK historical data')
		return response(symbol, market, interval, candles, 'SAHMK historical')
	}

	private static async fetchPolygon(
		symbol: string,
		market: CandleMarket,
		days: number,
	) {
		const key = process.env.POLYGON_API_KEY
		if (!key) throw new Error('POLYGON_API_KEY is not configured')
		const to = new Date().toISOString().slice(0, 10)
		const from = new Date(Date.now() - days * 86400000 * 1.5)
			.toISOString()
			.slice(0, 10)
		const data = await requestJson(
			`https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(symbol)}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=${days}&apiKey=${encodeURIComponent(key)}`,
		)
		const candles = (data?.results ?? [])
			.map((value: any) => ({
				date: new Date(Number(value.t) || 0).toISOString().slice(0, 10),
				open: Number(value.o),
				high: Number(value.h),
				low: Number(value.l),
				close: Number(value.c),
				volume: Number(value.v ?? 0),
			}))
			.filter(validCandle)
		if (!candles.length) throw new Error('No Polygon aggregates')
		return response(symbol, market, '1d', candles, 'Polygon.io')
	}

	private static async fetchYahoo(
		symbol: string,
		market: CandleMarket,
		interval: string,
		days: number,
	) {
		const suffix = market === 'EGX' ? '.CA' : market === 'TASI' ? '.SR' : ''
		const range = interval === '1wk' ? '5y' : interval === '1mo' ? '10y' : '1y'
		const data = await requestJson(
			`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(`${symbol}${suffix}`)}?interval=${interval === '1d' ? '1d' : interval}&range=${range}`,
		)
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
		const data = await requestJson(
			`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(`${symbol}${suffix}`)}&resolution=D&from=${from}&to=${to}&token=${encodeURIComponent(apiKey)}`,
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

	static async getQuote(symbol: string, market: CandleMarket = 'EGX') {
		const normalized = symbol.trim().toUpperCase()
		if (market === 'TASI' && process.env.SAHMK_API_KEY) {
			try {
				const data = await requestJson(
					`https://api.sahmk.sa/api/v1/quote/${encodeURIComponent(normalized)}/`,
					{ headers: { 'X-API-Key': process.env.SAHMK_API_KEY } },
				)
				if (Number.isFinite(Number(data?.price)))
					return {
						symbol: normalized,
						price: Number(data.price),
						changePercent: Number(data.change_percent ?? 0),
						source: 'SAHMK',
						freshness: data.is_delayed
							? ('delayed' as Freshness)
							: ('live' as Freshness),
						updatedAt: data.updated_at ?? new Date().toISOString(),
					}
			} catch (error) {
				console.warn(
					'SAHMK quote source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		if (process.env.TWELVE_DATA_API_KEY) {
			try {
				const providerSymbol =
					market === 'EGX' ? await resolveEgyptSymbol(normalized) : normalized
				const params = new URLSearchParams({
					symbol: providerSymbol,
					apikey: process.env.TWELVE_DATA_API_KEY,
				})
				const exchange =
					market === 'EGX' ? 'EGX' : market === 'TASI' ? 'TADAWUL' : ''
				if (exchange) params.set('exchange', exchange)
				const data = await requestJson(
					`https://api.twelvedata.com/quote?${params}`,
				)
				if (Number.isFinite(Number(data?.close)))
					return {
						symbol: normalized,
						price: Number(data.close),
						changePercent: Number(data.percent_change ?? 0),
						source: 'Twelve Data',
						freshness:
							process.env.TWELVE_DATA_REALTIME === 'true'
								? ('live' as Freshness)
								: ('delayed' as Freshness),
						updatedAt: data.datetime ?? new Date().toISOString(),
					}
			} catch (error) {
				console.warn(
					'Twelve Data quote source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		if (process.env.POLYGON_API_KEY) {
			try {
				const data = await requestJson(
					`https://api.polygon.io/v2/last/trade/${encodeURIComponent(normalized)}?apiKey=${encodeURIComponent(process.env.POLYGON_API_KEY)}`,
				)
				const price = Number(data?.results?.p)
				if (Number.isFinite(price) && price > 0)
					return {
						symbol: normalized,
						price,
						changePercent: null,
						source: 'Polygon.io',
						freshness: 'live' as Freshness,
						updatedAt: new Date().toISOString(),
					}
			} catch (error) {
				console.warn(
					'Polygon quote source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		try {
			const candles = await this.getCandles(normalized, market, '1d', 2)
			const last = candles.candles.at(-1)
			const previous = candles.candles.at(-2)
			if (last)
				return {
					symbol: normalized,
					price: last.close,
					changePercent: previous
						? ((last.close - previous.close) / previous.close) * 100
						: null,
					source: candles.source,
					freshness: candles.freshness,
					updatedAt: candles.fetched_at,
				}
		} catch (error) {
			console.warn(
				'Candle quote fallback failed:',
				error instanceof Error ? error.message : error,
			)
		}
		return {
			symbol: normalized,
			price: null,
			changePercent: null,
			source: 'unavailable',
			freshness: 'cached' as Freshness,
			updatedAt: null,
		}
	}
}
