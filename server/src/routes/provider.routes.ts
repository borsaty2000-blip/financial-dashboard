import { Router } from 'express'
import {
	providerConfig,
	testProvider,
	type ProviderMarket,
} from '../services/market/provider.service.js'
import { makeDataQuality } from '../services/market/data-quality.js'

const providerRoutes = Router()
const markets = new Set<ProviderMarket>([
	'EGX',
	'TASI',
	'CRYPTO',
	'FOREX',
	'COMMODITIES',
])

providerRoutes.get('/config', (_request, response) => {
	response.json(providerConfig())
})

providerRoutes.get('/test', async (request, response) => {
	const market = String(
		request.query.market ?? 'EGX',
	).toUpperCase() as ProviderMarket
	const symbol = String(request.query.symbol ?? '').trim()
	const interval = String(request.query.interval ?? '1m')
	if (!markets.has(market) || !symbol)
		return response.status(400).json({
			status: 'error',
			message: 'market و symbol مطلوبان',
		})
	const data = await testProvider(symbol, market, interval)
	return response.json({
		status:
			data.data_quality.status === 'unavailable' ? 'unavailable' : 'success',
		market,
		symbol,
		...data,
	})
})

providerRoutes.get('/debug', async (request, response) => {
	const symbol = String(request.query.symbol ?? '1010').trim().toUpperCase()
	const started = Date.now()
	const base = (process.env.SAHMK_BASE_URL ?? 'https://api.sahmk.sa/api/v1').replace(/\/$/u, '')
	const key = process.env.SAHMK_API_KEY
	if (!key) {
		return response.json({
			status: 'unavailable',
			provider: 'SAHMK',
			symbol,
			endpoint: `${base}/quote/${encodeURIComponent(symbol)}/`,
			api_key_configured: false,
			data_quality: makeDataQuality({ status: 'unavailable', provider: 'SAHMK', warnings: ['SAHMK_API_KEY غير مضبوط'] }),
		})
	}
	try {
		const result = await fetch(`${base}/quote/${encodeURIComponent(symbol)}/`, {
			headers: { 'X-API-Key': key },
			signal: AbortSignal.timeout(10_000),
		})
		const body = await result.json().catch(() => ({})) as Record<string, unknown>
		const isDelayed = body.is_delayed === true
		const updatedAt = typeof body.updated_at === 'string' ? body.updated_at : null
		return response.json({
			status: result.ok ? 'success' : 'error',
			provider: 'SAHMK',
			symbol,
			endpoint: `${base}/quote/${encodeURIComponent(symbol)}/`,
			http_status: result.status,
			latency_ms: Date.now() - started,
			api_key_configured: true,
			raw_fields: Object.keys(body).sort(),
			price_present: Number.isFinite(Number(body.price)),
			is_delayed: isDelayed,
			updated_at: updatedAt,
			provider_timestamp: typeof body.timestamp === 'string' ? body.timestamp : null,
			data_quality: makeDataQuality({
				status: !result.ok ? 'unavailable' : isDelayed ? 'delayed' : 'live',
				provider: 'SAHMK',
				timestamp: updatedAt,
				thresholdSeconds: 60,
				realtimeTick: result.ok && !isDelayed,
				warnings: !result.ok ? ['استجابة SAHMK غير ناجحة'] : [],
			}),
		})
	} catch (error) {
		return response.json({
			status: 'error',
			provider: 'SAHMK',
			symbol,
			latency_ms: Date.now() - started,
			error: error instanceof Error ? error.message : 'SAHMK request failed',
			data_quality: makeDataQuality({ status: 'unavailable', provider: 'SAHMK', warnings: ['تعذر الاتصال بمزود SAHMK'] }),
		})
	}
})

export { providerRoutes }
