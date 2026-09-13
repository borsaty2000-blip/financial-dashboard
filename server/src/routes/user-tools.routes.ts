import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { z } from 'zod'
import {
	addWatchlistItem,
	createAlert,
	createWatchlist,
	deleteAlert,
	deleteWatchlist,
	listAlerts,
	listNotifications,
	listWatchlists,
	readAllNotifications,
	readNotification,
	removeWatchlistItem,
	updateAlert,
} from '../services/user-tools.service.js'

export const userToolsRoutes = Router()
userToolsRoutes.use(requireAuth)
const symbol = z.string().trim().min(1).max(20)
const alertSchema = z.object({
	symbol,
	market: z.string().optional(),
	condition: z.enum(['ABOVE', 'BELOW', 'PERCENT_UP', 'PERCENT_DOWN']),
	targetValue: z.number().finite(),
})
const guard =
	(fn: (req: any, res: any) => Promise<unknown>) =>
	async (req: any, res: any) => {
		try {
			res.json(await fn(req, res))
		} catch (error) {
			res.status(400).json({
				error: error instanceof Error ? error.message : 'تعذر تنفيذ الطلب',
			})
		}
	}
userToolsRoutes.get(
	'/watchlists',
	guard((req) => listWatchlists(req.userId)),
)
userToolsRoutes.post(
	'/watchlists',
	guard((req) =>
		createWatchlist(
			req.userId,
			z
				.object({ name: z.string().trim().min(1).max(80).optional() })
				.parse(req.body).name,
		),
	),
)
userToolsRoutes.delete(
	'/watchlists/:id',
	guard((req) => deleteWatchlist(req.userId, req.params.id)),
)
userToolsRoutes.post(
	'/watchlists/:id/items',
	guard((req) => {
		const body = z
			.object({ symbol, market: z.string().optional() })
			.parse(req.body)
		return addWatchlistItem(req.userId, req.params.id, body.symbol, body.market)
	}),
)
userToolsRoutes.delete(
	'/watchlists/:id/items/:symbol',
	guard((req) =>
		removeWatchlistItem(req.userId, req.params.id, req.params.symbol),
	),
)
userToolsRoutes.get(
	'/alerts',
	guard((req) => listAlerts(req.userId)),
)
userToolsRoutes.post(
	'/alerts',
	guard((req) => createAlert(req.userId, alertSchema.parse(req.body))),
)
userToolsRoutes.put(
	'/alerts/:id',
	guard((req) =>
		updateAlert(
			req.userId,
			req.params.id,
			z
				.object({
					isActive: z.boolean().optional(),
					targetValue: z.number().finite().optional(),
				})
				.parse(req.body),
		),
	),
)
userToolsRoutes.delete(
	'/alerts/:id',
	guard((req) => deleteAlert(req.userId, req.params.id)),
)
userToolsRoutes.get(
	'/notifications',
	guard((req) => listNotifications(req.userId)),
)
userToolsRoutes.put(
	'/notifications/:id/read',
	guard((req) => readNotification(req.userId, req.params.id)),
)
userToolsRoutes.put(
	'/notifications/read-all',
	guard((req) => readAllNotifications(req.userId)),
)
