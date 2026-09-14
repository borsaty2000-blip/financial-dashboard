import { Router } from 'express'
import { NewsService } from '../services/news/news.service.js'

export const newsRoutes = Router()
newsRoutes.get('/', async (request, response) => {
	try {
		const data = await NewsService.list({
			symbol:
				typeof request.query.symbol === 'string'
					? request.query.symbol
					: undefined,
			category:
				typeof request.query.category === 'string'
					? request.query.category
					: undefined,
			limit: Number(request.query.limit ?? 50),
		})
		return response.json({
			data,
			available: data.length > 0,
			message:
				data.length > 0 ? undefined : 'لا توجد أخبار موثوقة متاحة حالياً',
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'News unavailable',
		})
	}
})
newsRoutes.get('/:symbol', async (request, response) => {
	try {
		const data = await NewsService.list({
			symbol: request.params.symbol,
			limit: 20,
		})
		return response.json({
			data,
			available: data.length > 0,
			message:
				data.length > 0 ? undefined : 'لا توجد أخبار موثوقة متاحة حالياً',
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'News unavailable',
		})
	}
})
