import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import {
	listEconomicEvents,
	notifyImportantEvents,
	seedEconomicEvents,
} from '../services/calendar/economic-events.service.js'

export const calendarRoutes = Router()
calendarRoutes.get('/events', async (request, response) => {
	try {
		return response.json({
			data: await listEconomicEvents({
				country: String(request.query.country ?? ''),
				importance: String(request.query.importance ?? ''),
				category: String(request.query.category ?? ''),
				from:
					typeof request.query.from === 'string'
						? request.query.from
						: undefined,
				to: typeof request.query.to === 'string' ? request.query.to : undefined,
			}),
			available: true,
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Calendar unavailable',
		})
	}
})
calendarRoutes.post('/seed', async (_request, response) =>
	response.json({ seeded: await seedEconomicEvents() }),
)
calendarRoutes.post('/notify', requireAuth, async (request, response) =>
	response.json(await notifyImportantEvents(request.userId!)),
)
