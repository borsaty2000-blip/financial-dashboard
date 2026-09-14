import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
	createSmartPortfolio,
	getSmartPortfolio,
	rebalancePlan,
} from '../services/portfolio/smart-portfolio.service.js'

export const smartPortfolioRoutes = Router()
smartPortfolioRoutes.use(requireAuth)
function risk(value: unknown) {
	return ['CONSERVATIVE', 'BALANCED', 'AGGRESSIVE'].includes(String(value))
		? (String(value) as 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE')
		: 'BALANCED'
}

smartPortfolioRoutes.post('/smart/create', async (request, response) => {
	try {
		return response
			.status(201)
			.json(
				await createSmartPortfolio(
					request.userId!,
					risk(request.body?.riskProfile),
				),
			)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Smart portfolio unavailable',
		})
	}
})
smartPortfolioRoutes.get('/smart', async (request, response) => {
	try {
		return response.json(
			await getSmartPortfolio(request.userId!, risk(request.query.riskProfile)),
		)
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
		return response.json(
			await rebalancePlan(request.userId!, risk(request.query.riskProfile)),
		)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Rebalance plan unavailable',
		})
	}
})
smartPortfolioRoutes.post('/smart/rebalance', async (request, response) => {
	try {
		return response.json(
			await rebalancePlan(request.userId!, risk(request.body?.riskProfile)),
		)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Rebalance plan unavailable',
		})
	}
})
