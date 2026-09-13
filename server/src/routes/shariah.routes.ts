import { Router } from 'express'
import {
	batchScreen,
	getMethodologies,
	screenStock,
} from '../services/shariah/halal.service.js'

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
		response.status(502).json({
			available: false,
			source: 'Halal Terminal',
			error:
				error instanceof Error ? error.message : 'Shariah service unavailable',
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
