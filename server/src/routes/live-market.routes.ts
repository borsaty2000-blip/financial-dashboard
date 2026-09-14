import { Router } from 'express'
import { getEgxSummary } from '../services/market/egx.adapter.js'
import { getTasiSummary } from '../services/market/sahmk.adapter.js'
import { CandlesService } from '../services/market/candles.service.js'
import { getEgyptCompanies } from '../services/market/twelve-data.adapter.js'
import { NewsService } from '../services/news/news.service.js'

type QuoteData = Record<string, unknown>

const liveMarketRoutes = Router()
let directoryCache: { expiresAt: number; value: unknown[] } | null = null
let liveCache: { expiresAt: number; value: unknown } | null = null

const numberFrom = (value: unknown, keys: string[]) => {
	if (!value || typeof value !== 'object') return null
	const record = value as Record<string, unknown>
	for (const key of keys) {
		const candidate = record[key]
		const parsed = typeof candidate === 'number' ? candidate : Number(candidate)
		if (Number.isFinite(parsed)) return parsed
	}
	return null
}

function indexCard(
	value: unknown,
	envelope: {
		source: string
		freshness: string
		timestamp: string
		delay_minutes: number
		available: boolean
	},
) {
	return {
		value: numberFrom(value, [
			'value',
			'price',
			'close',
			'indexValue',
			'index_value',
		]),
		change: numberFrom(value, ['change', 'changeValue', 'change_value']),
		changePercent: numberFrom(value, [
			'changePercent',
			'change_percent',
			'percentChange',
			'index_change_percent',
		]),
		source: envelope.source,
		freshness: envelope.freshness,
		timestamp: envelope.timestamp,
		delayedByMinutes: envelope.delay_minutes,
		available: envelope.available,
	}
}

async function companies() {
	if (directoryCache && directoryCache.expiresAt > Date.now())
		return directoryCache.value
	const result = await getEgyptCompanies()
	const value = result.slice(0, 60).map((company) => ({
		symbol: company.symbol,
		name: company.name,
		currency: company.currency,
		exchange: company.exchange,
		price: null,
		changePercent: null,
		available: false,
		freshness: 'unavailable',
	}))
	directoryCache = { expiresAt: Date.now() + 86_400_000, value }
	return value
}

async function quotes(symbols: string[], market: 'EGX' | 'TASI') {
	const result = await Promise.all(
		symbols.slice(0, 12).map(async (symbol) => {
			try {
				const quote = await CandlesService.getQuote(symbol, market)
				const price = typeof quote.price === 'number' ? quote.price : null
				if (price == null || quote.source === 'unavailable') return null
				return {
					symbol,
					price,
					changePercent: quote.changePercent,
					source: quote.source,
					freshness: quote.freshness,
					timestamp: quote.updatedAt,
					delayedByMinutes: quote.freshness === 'live' ? 0 : 15,
				}
			} catch {
				return null
			}
		}),
	)
	return result.filter(
		(item): item is NonNullable<typeof item> => item !== null,
	)
}

liveMarketRoutes.get('/live', async (_request, response) => {
	try {
		if (liveCache && liveCache.expiresAt > Date.now())
			return response.json(liveCache.value)
		const [egx, tasi, directory, news] = await Promise.all([
			getEgxSummary(),
			getTasiSummary(),
			companies().catch(() => []),
			NewsService.list({ limit: 10 }),
		])
		const egxData = (egx.data ?? {}) as Record<string, unknown>
		const tasiData = (tasi.data ?? {}) as QuoteData
		const directorySymbols = directory.map((item) =>
			String((item as { symbol: string }).symbol),
		)
		const topMovers = await quotes(directorySymbols, 'EGX')
		const result = {
			indices: {
				egx30: indexCard(egxData.egx30, egx),
				egx70: indexCard(egxData.egx70, egx),
				egx100: indexCard(egxData.egx100, egx),
				tasi: indexCard(tasiData, tasi),
				gold: indexCard(egxData.gold, egx),
				silver: indexCard(egxData.silver, egx),
			},
			topMovers,
			topTraded: topMovers.slice(0, 10),
			companies: directory,
			latestSignals: [],
			news,
			available:
				egx.available ||
				tasi.available ||
				directory.length > 0 ||
				news.length > 0,
			source: egx.source === tasi.source ? egx.source : 'mixed',
			freshness: [egx.freshness, tasi.freshness].includes('delayed')
				? 'delayed'
				: 'live',
			timestamp: new Date().toISOString(),
			note: 'تظهر الأسعار فقط عندما تعيد المصادر قيمة موثوقة؛ دليل الشركات لا يعني توفر سعر لحظي.',
		}
		liveCache = { expiresAt: Date.now() + 30_000, value: result }
		return response.json(result)
	} catch (error) {
		return response.status(503).json({
			available: false,
			indices: {},
			topMovers: [],
			topTraded: [],
			companies: [],
			latestSignals: [],
			news: [],
			message:
				error instanceof Error
					? error.message
					: 'Market live endpoint unavailable',
		})
	}
})

export { liveMarketRoutes }
