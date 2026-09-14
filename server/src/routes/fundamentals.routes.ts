import { Router } from 'express'
import { FundamentalsService } from '../services/market/fundamentals.service.js'

export const fundamentalsRoutes = Router()
fundamentalsRoutes.get('/:symbol', async (request, response) => {
	try {
		return response.json(
			await FundamentalsService.getFundamentals(request.params.symbol),
		)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Fundamentals unavailable',
		})
	}
})
fundamentalsRoutes.get('/:symbol/ratios', async (request, response) => {
	try {
		return response.json({
			symbol: request.params.symbol.toUpperCase(),
			data: await FundamentalsService.getKeyRatios(request.params.symbol),
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Ratios unavailable',
		})
	}
})
fundamentalsRoutes.get('/:symbol/dividends', async (request, response) => {
	try {
		return response.json({
			symbol: request.params.symbol.toUpperCase(),
			data: await FundamentalsService.getDividendHistory(request.params.symbol),
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Dividends unavailable',
		})
	}
})
