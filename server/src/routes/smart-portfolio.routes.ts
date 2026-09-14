import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
	getSmartPortfolio,
	rebalancePlan,
} from '../services/portfolio/smart-portfolio.service.js'

export const smartPortfolioRoutes = Router()
smartPortfolioRoutes.use(requireAuth)
smartPortfolioRoutes.get('/smart', async (request, response) => {
	try {
		return response.json(await getSmartPortfolio(request.userId!))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Smart portfolio unavailable',
		})
	}
})
smartPortfolioRoutes.get('/smart/rebalance', async (request, response) => {
	try {
		return response.json(await rebalancePlan(request.userId!))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Rebalance plan unavailable',
		})
	}
})
