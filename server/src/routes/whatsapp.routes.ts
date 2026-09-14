import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	configureWhatsApp,
	sendWhatsApp,
	verifyWhatsApp,
} from '../services/notifications/whatsapp.service.js'
import { prisma } from '../lib/prisma.js'
export const whatsappRoutes = Router()
whatsappRoutes.get('/whatsapp/status', requireAuth, async (request, response) =>
	response.json(
		await prisma.whatsAppSubscription.findUnique({
			where: { userId: request.userId! },
			select: {
				phoneNumber: true,
				isVerified: true,
				alertTypes: true,
				createdAt: true,
			},
		}),
	),
)
whatsappRoutes.post(
	'/whatsapp/subscribe',
	requireAuth,
	async (request, response) => {
		const parsed = z
			.object({
				phoneNumber: z.string().min(8).max(30),
				alertTypes: z
					.array(z.enum(['PRICE', 'SIGNAL', 'NEWS', 'ACHIEVEMENT']))
					.default(['PRICE']),
			})
			.safeParse(request.body)
		if (!parsed.success)
			return response
				.status(400)
				.json({ error: 'رقم الهاتف وأنواع التنبيه مطلوبة' })
		const subscription = await configureWhatsApp(
			request.userId!,
			parsed.data.phoneNumber,
			parsed.data.alertTypes,
		)
		return response.status(201).json({
			subscription: {
				phoneNumber: subscription.phoneNumber,
				isVerified: subscription.isVerified,
				alertTypes: subscription.alertTypes,
			},
			verificationRequired: true,
			developmentCode:
				process.env.NODE_ENV === 'production'
					? undefined
					: subscription.verificationCode,
		})
	},
)
whatsappRoutes.post(
	'/whatsapp/verify',
	requireAuth,
	async (request, response) => {
		const parsed = z
			.object({ code: z.string().length(6) })
			.safeParse(request.body)
		if (!parsed.success)
			return response.status(400).json({ error: 'رمز التحقق غير صالح' })
		const valid = await verifyWhatsApp(request.userId!, parsed.data.code)
		return valid
			? response.json({ verified: true })
			: response.status(400).json({ verified: false, error: 'رمز التحقق خاطئ' })
	},
)
whatsappRoutes.post('/whatsapp', requireAuth, async (request, response) => {
	const parsed = z
		.object({
			to: z.string().min(8).max(30),
			message: z.string().min(1).max(1000),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'رقم الهاتف والرسالة مطلوبان' })
	const result = await sendWhatsApp(parsed.data.to, parsed.data.message)
	return response.status(result.accepted ? 202 : 503).json(result)
})
