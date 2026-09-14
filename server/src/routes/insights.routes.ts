import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getDigitalTwin } from '../services/analytics/twin.service.js'
import { getGlobalComparison } from '../services/comparison/global.service.js'
import {
	getWeeklyDigest,
	getWeeklyHistory,
} from '../services/reports/weekly.service.js'

export const insightsRoutes = Router()
insightsRoutes.get(
	'/reports/weekly',
	requireAuth,
	async (request, response) => {
		try {
			return response.json(await getWeeklyDigest(request.userId!))
		} catch (error) {
			return response.status(502).json({
				error:
					error instanceof Error ? error.message : 'Weekly report unavailable',
			})
		}
	},
)
insightsRoutes.get('/twin/:userId', requireAuth, async (request, response) => {
	if (request.userId !== request.params.userId)
		return response.status(403).json({ error: 'غير مصرح' })
	try {
		return response.json(await getDigitalTwin(request.userId))
	} catch (error) {
		return response.status(502).json({
			error:
				error instanceof Error ? error.message : 'Digital twin unavailable',
		})
	}
})
insightsRoutes.get(
	'/reports/weekly/history',
	requireAuth,
	async (request, response) => {
		try {
			return response.json(await getWeeklyHistory(request.userId!))
		} catch (error) {
			return response.status(502).json({
				error:
					error instanceof Error ? error.message : 'Weekly history unavailable',
			})
		}
	},
)
insightsRoutes.get('/comparison/global', async (request, response) => {
	const period = ['1M', '3M', '6M', '1Y'].includes(String(request.query.period))
		? (String(request.query.period) as '1M' | '3M' | '6M' | '1Y')
		: '1Y'
	try {
		return response.json(await getGlobalComparison(period))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error
					? error.message
					: 'Global comparison unavailable',
		})
	}
})
