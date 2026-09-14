import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	listPushNotifications,
	subscribeToPush,
	unsubscribeFromPush,
} from '../services/notifications/push.service.js'
export const pushRoutes = Router()
pushRoutes.get('/status', requireAuth, (_request, response) =>
	response.json({
		configured: Boolean(
			process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY,
		),
		publicKey: process.env.VAPID_PUBLIC_KEY ?? null,
	}),
)
pushRoutes.get('/notifications', requireAuth, async (request, response) =>
	response.json(await listPushNotifications(request.userId!)),
)
pushRoutes.post('/subscribe', requireAuth, async (request, response) => {
	const parsed = z
		.object({
			endpoint: z.string().url(),
			keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(4) }),
			deviceType: z.enum(['WEB', 'IOS', 'ANDROID']).optional(),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response
			.status(400)
			.json({ error: 'بيانات جهاز الإشعارات غير صالحة' })
	return response
		.status(201)
		.json(await subscribeToPush(request.userId!, parsed.data))
})
pushRoutes.delete('/subscribe', requireAuth, async (request, response) => {
	await unsubscribeFromPush(
		request.userId!,
		typeof request.query.endpoint === 'string'
			? request.query.endpoint
			: undefined,
	)
	return response.status(204).send()
})
