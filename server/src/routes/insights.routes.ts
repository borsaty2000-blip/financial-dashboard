import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { getDigitalTwin } from '../services/analytics/twin.service.js'
import { getGlobalComparison } from '../services/comparison/global.service.js'
import { getWeeklyDigest } from '../services/reports/weekly.service.js'

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
insightsRoutes.get('/comparison/global', async (_request, response) =>
	response.json(await getGlobalComparison()),
)
