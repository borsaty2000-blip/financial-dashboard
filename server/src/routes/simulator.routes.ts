import { Router } from 'express'
import { z } from 'zod'
import {
	compareInvestments,
	simulateInvestment,
	whatIfScenario,
} from '../services/simulator/simulator.service.js'

export const simulatorRoutes = Router()
const investSchema = z.object({
	symbol: z.string().min(1).max(20),
	amount: z.number().positive().finite(),
	startDate: z.string().optional(),
	endDate: z.string().optional(),
	market: z.enum(['EGX', 'TASI', 'GLOBAL']).optional(),
})

simulatorRoutes.post('/invest', async (request, response) => {
	const parsed = investSchema.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات المحاكاة غير صالحة' })
	try {
		return response.json(
			await simulateInvestment(
				parsed.data.symbol,
				parsed.data.amount,
				parsed.data.startDate,
				parsed.data.endDate,
				parsed.data.market,
			),
		)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Simulator unavailable',
		})
	}
})

simulatorRoutes.post('/compare', async (request, response) => {
	const parsed = z
		.object({
			symbols: z.array(z.string()).min(1).max(8),
			amount: z.number().positive(),
			period: z.number().int().positive().max(3650).optional(),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات المقارنة غير صالحة' })
	try {
		return response.json(
			await compareInvestments(
				parsed.data.symbols,
				parsed.data.amount,
				parsed.data.period,
			),
		)
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Simulator unavailable',
		})
	}
})

simulatorRoutes.post('/what-if', async (request, response) => {
	const parsed = investSchema.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات السيناريو غير صالحة' })
	try {
		return response.json(await whatIfScenario(parsed.data))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Simulator unavailable',
		})
	}
})
