import { Router } from 'express'
import {
	batchScreen,
	getMethodologies,
	screenStock,
} from '../services/shariah/halal.service.js'
import {
	dividendPurification,
	generateShariahCertificate,
	screenWith5Methodologies,
} from '../services/shariah/advanced-shariah.service.js'

export const shariahRoutes = Router()

shariahRoutes.get('/methodologies', async (_request, response) => {
	response.json(await getMethodologies())
})

shariahRoutes.get('/screen/:symbol', async (request, response) => {
	try {
		response.json(
			await screenStock(
				request.params.symbol,
				typeof request.query.methodology === 'string'
					? request.query.methodology
					: undefined,
			),
		)
	} catch (error) {
		response.status(200).json({
			available: false,
			source: 'Halal Terminal',
			message: 'خدمة الفحص الشرعي غير متاحة حالياً',
			error:
				process.env.NODE_ENV === 'development' && error instanceof Error
					? error.message
					: undefined,
		})
	}
})

shariahRoutes.post('/batch-screen', async (request, response) => {
	const symbols = Array.isArray(request.body?.symbols)
		? request.body.symbols.filter(
				(value: unknown): value is string => typeof value === 'string',
			)
		: []
	if (!symbols.length)
		return response
			.status(400)
			.json({ error: 'symbols must be a non-empty array' })
	try {
		response.json(await batchScreen(symbols))
	} catch (error) {
		response.status(502).json({
			available: false,
			source: 'Halal Terminal',
			error:
				error instanceof Error ? error.message : 'Shariah service unavailable',
		})
	}
})

shariahRoutes.get('/advanced/:symbol', async (request, response) => {
	try {
		return response.json(await screenWith5Methodologies(request.params.symbol))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Advanced Shariah unavailable',
		})
	}
})

shariahRoutes.get(
	'/advanced/:symbol/certificate',
	async (request, response) => {
		try {
			const certificate = await generateShariahCertificate(
				request.params.symbol,
			)
			response.setHeader(
				'Content-Disposition',
				`attachment; filename="borsaty-${certificate.symbol}-shariah-certificate.json"`,
			)
			return response.json(certificate)
		} catch (error) {
			return response.status(502).json({
				available: false,
				error:
					error instanceof Error ? error.message : 'Certificate unavailable',
			})
		}
	},
)

shariahRoutes.post('/advanced/:symbol/purification', (request, response) => {
	const dividends = request.body?.dividends
	if (typeof dividends !== 'number' && !Array.isArray(dividends))
		return response
			.status(400)
			.json({ error: 'dividends must be a number or array' })
	return response.json(
		dividendPurification(
			request.params.symbol,
			dividends,
			Number(request.body?.purificationRate ?? 0),
		),
	)
})
