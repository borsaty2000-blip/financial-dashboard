import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { CandlesService } from '../services/market/candles.service.js'
import { NewsService } from '../services/news/news.service.js'
import { analyzeElliott } from '../services/analysis/elliott.python.js'
import { analyzeGann } from '../services/analysis/gann.python.js'
import { ConsensusService } from '../services/analysis/consensus.service.js'
import {
	generateKey,
	getUsageStats,
	listKeys,
	revokeKey,
	validateKey,
} from '../services/developer/api-key.service.js'
import { apiKeyAuthV1 } from '../middleware/api-key-auth.js'

export const developerRoutes = Router()
export const developerApiRoutes = Router()
const catalog = [
	'COMI',
	'ABUK',
	'ETEL',
	'SWDY',
	'TMGH',
	'ORAS',
	'MFPC',
	'EKHO',
	'HRHO',
	'CIEC',
	'2222',
	'1120',
].map((symbol) => ({ symbol, market: /^[0-9]/.test(symbol) ? 'TASI' : 'EGX' }))

export async function legacyApiKeyAuth(
	request: Request,
	response: Response,
	next: NextFunction,
) {
	const raw =
		request.header('x-api-key') ??
		request.headers.authorization?.replace(/^Bearer\s+/i, '')
	if (!raw?.startsWith('bors_') && !raw?.startsWith('brs_'))
		return response.status(401).json({ error: 'x-api-key مطلوب' })
	try {
		const key = await validateKey(raw)
		if (!key) return response.status(401).json({ error: 'مفتاح API غير صالح' })
		request.userId = key.userId
		next()
	} catch {
		return response.status(503).json({ error: 'خدمة مفاتيح API غير متاحة' })
	}
}

developerRoutes.use(requireAuth)
developerRoutes.get('/keys', async (request, response) => {
	try {
		return response.json(await listKeys(request.userId!))
	} catch {
		return response.status(503).json({ error: 'تعذر قراءة المفاتيح' })
	}
})
developerRoutes.post('/keys', async (request, response) => {
	const parsed = z
		.object({ name: z.string().min(2).max(80) })
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'اسم المفتاح غير صالح' })
	try {
		return response
			.status(201)
			.json(await generateKey(request.userId!, parsed.data.name))
	} catch {
		return response.status(503).json({ error: 'تعذر إنشاء المفتاح' })
	}
})
developerRoutes.delete('/keys/:id', async (request, response) => {
	try {
		await revokeKey(request.userId!, request.params.id)
		return response.status(204).send()
	} catch {
		return response.status(503).json({ error: 'تعذر إلغاء المفتاح' })
	}
})
developerRoutes.get('/usage', async (request, response) => {
	try {
		return response.json(
			await getUsageStats(
				request.userId!,
				String(request.query.period ?? '30d'),
			),
		)
	} catch {
		return response.status(503).json({ error: 'تعذر قراءة الاستخدام' })
	}
})
developerRoutes.get('/docs', (_request, response) =>
	response.json({
		openapi: '3.0.3',
		title: 'Borsaty Developer API',
		auth: 'X-API-Key: bors_...',
		rateLimits: { FREE: '100/day', PRO: '10000/day', ENTERPRISE: 'unlimited' },
		examples: {
			curl: 'curl -H "X-API-Key: bors_..." https://borsatyai.com/api/v1/stocks',
			javascript: 'fetch(url, { headers: { "X-API-Key": key } })',
			python: 'requests.get(url, headers={"X-API-Key": key})',
		},
	}),
)

developerApiRoutes.use(apiKeyAuthV1)
developerApiRoutes.get('/stocks', (_request, response) =>
	response.json({ data: catalog, count: catalog.length }),
)
developerApiRoutes.get('/stocks/:symbol/candles', async (request, response) => {
	try {
		const market = request.query.market === 'TASI' ? 'TASI' : 'EGX'
		const data = await CandlesService.getCandles(
			request.params.symbol,
			market,
			String(request.query.interval ?? '1d'),
			Math.min(Number(request.query.limit) || 250, 2000),
		)
		return response.json({
			...data,
			symbol: request.params.symbol.toUpperCase(),
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Candles unavailable',
		})
	}
})
developerApiRoutes.get('/stocks/:symbol', async (request, response) => {
	try {
		const data = await CandlesService.getCandles(
			request.params.symbol,
			'EGX',
			'1d',
			2,
		)
		return response.json({
			symbol: request.params.symbol.toUpperCase(),
			quote: data.candles.at(-1) ?? null,
			previous: data.candles.at(-2) ?? null,
			available: Boolean(data.candles.length),
			source: data.source,
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Stock unavailable',
		})
	}
})
async function series(symbol: string) {
	const data = await CandlesService.getCandles(symbol, 'EGX', '1d', 250)
	return {
		prices: data.candles.map((item) => item.close),
		dates: data.candles.map((item) => item.date),
	}
}
developerApiRoutes.get(
	'/analysis/:symbol/elliott',
	async (request, response) => {
		const value = await series(request.params.symbol)
		return response.json({
			data: await analyzeElliott(value.prices),
			symbol: request.params.symbol.toUpperCase(),
		})
	},
)
developerApiRoutes.get('/analysis/:symbol/gann', async (request, response) => {
	const value = await series(request.params.symbol)
	return response.json({
		data: await analyzeGann(value.prices, value.dates),
		symbol: request.params.symbol.toUpperCase(),
	})
})
developerApiRoutes.get(
	'/analysis/:symbol/consensus',
	async (request, response) => {
		const value = await series(request.params.symbol)
		return response.json({
			data: await ConsensusService.calculate(
				request.params.symbol,
				value.prices,
				value.dates,
			),
		})
	},
)
developerApiRoutes.get('/market/summary', (_request, response) =>
	response.json({
		data: catalog.filter(
			(item) => item.symbol === 'COMI' || item.symbol === '2222',
		),
		available: true,
	}),
)
developerApiRoutes.get('/news', async (request, response) =>
	response.json({
		data: await NewsService.list({
			symbol:
				typeof request.query.symbol === 'string'
					? request.query.symbol
					: undefined,
			limit: Number(request.query.limit) || 20,
		}),
	}),
)
