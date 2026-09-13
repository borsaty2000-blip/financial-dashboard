import { Router } from 'express'
import { ComparisonService } from '../services/comparison/comparison.service.js'
import type { CandleMarket } from '../services/market/candles.service.js'

export const comparisonRoutes = Router()
comparisonRoutes.get('/', async (request, response) => {
	const symbols =
		typeof request.query.symbols === 'string'
			? request.query.symbols.split(',')
			: []
	const market: CandleMarket =
		request.query.market === 'TASI' || request.query.market === 'GLOBAL'
			? request.query.market
			: 'EGX'
	try {
		response.json(await ComparisonService.compare(symbols, market))
	} catch (error) {
		response.status(400).json({
			status: 'error',
			message: error instanceof Error ? error.message : 'تعذر مقارنة الأسهم',
		})
	}
})
