import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	executeBuy,
	executeSell,
	getOrderHistory,
	getPerformance,
	getPortfolioValue,
	getPositions,
} from '../services/trading.service.js'

export const tradingRoutes = Router()
tradingRoutes.use(requireAuth)
const orderSchema = z.object({
	symbol: z.string().trim().min(1).max(20),
	quantity: z.number().int().positive().max(1_000_000),
})
const run =
	(fn: (req: any) => Promise<unknown>) => async (req: any, res: any) => {
		try {
			res.json(await fn(req))
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : 'تعذر تنفيذ العملية',
			})
		}
	}
tradingRoutes.post(
	'/buy',
	run((req) => {
		const data = orderSchema.parse(req.body)
		return executeBuy(req.userId, data.symbol, data.quantity)
	}),
)
tradingRoutes.post(
	'/sell',
	run((req) => {
		const data = orderSchema.parse(req.body)
		return executeSell(req.userId, data.symbol, data.quantity)
	}),
)
tradingRoutes.get(
	'/portfolio',
	run((req) => getPortfolioValue(req.userId)),
)
tradingRoutes.get(
	'/positions',
	run((req) => getPositions(req.userId)),
)
tradingRoutes.get(
	'/orders',
	run((req) => getOrderHistory(req.userId)),
)
tradingRoutes.get(
	'/performance',
	run((req) => getPerformance(req.userId)),
)
