import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import {
	beginTwoFactor,
	confirmTwoFactor,
	disableTwoFactor,
} from '../services/auth/two-factor.service.js'
export const securityRoutes = Router()
securityRoutes.use(requireAuth)
securityRoutes.get('/status', async (request, response) => {
	const user = await prisma.user.findUnique({
		where: { id: request.userId! },
		select: { twoFactorEnabled: true },
	})
	response.json({ twoFactorEnabled: user?.twoFactorEnabled ?? false })
})
securityRoutes.post('/2fa/setup', async (request, response) =>
	response.json(await beginTwoFactor(request.userId!)),
)
securityRoutes.post('/2fa/confirm', async (request, response) => {
	const parsed = z
		.object({ secret: z.string().min(16), code: z.string().regex(/^\d{6}$/) })
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات 2FA غير صالحة' })
	try {
		return response.json(
			await confirmTwoFactor(
				request.userId!,
				parsed.data.secret,
				parsed.data.code,
			),
		)
	} catch (error) {
		return response
			.status(400)
			.json({
				error: error instanceof Error ? error.message : 'تعذر تفعيل 2FA',
			})
	}
})
securityRoutes.post('/2fa/disable', async (request, response) => {
	const parsed = z
		.object({ code: z.string().regex(/^\d{6}$/) })
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'رمز 2FA غير صالح' })
	try {
		return response.json(
			await disableTwoFactor(request.userId!, parsed.data.code),
		)
	} catch (error) {
		return response
			.status(400)
			.json({
				error: error instanceof Error ? error.message : 'تعذر تعطيل 2FA',
			})
	}
})
securityRoutes.get('/sessions', async (request, response) =>
	response.json(
		await prisma.session.findMany({
			where: {
				userId: request.userId!,
				revokedAt: null,
				expiresAt: { gt: new Date() },
			},
			select: {
				id: true,
				userAgent: true,
				ipAddress: true,
				expiresAt: true,
				createdAt: true,
			},
			orderBy: { createdAt: 'desc' },
		}),
	),
)
securityRoutes.delete('/sessions/:id', async (request, response) => {
	await prisma.session.updateMany({
		where: { id: request.params.id, userId: request.userId! },
		data: { revokedAt: new Date() },
	})
	response.status(204).send()
})
securityRoutes.delete('/sessions', async (request, response) => {
	await prisma.session.updateMany({
		where: { userId: request.userId!, revokedAt: null },
		data: { revokedAt: new Date() },
	})
	response.status(204).send()
})
securityRoutes.get('/login-history', async (request, response) =>
	response.json(
		await prisma.loginHistory.findMany({
			where: { userId: request.userId! },
			orderBy: { createdAt: 'desc' },
			take: 20,
		}),
	),
)
