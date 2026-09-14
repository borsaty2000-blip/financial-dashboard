import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'

export const analystsRoutes = Router()
analystsRoutes.get('/', async (_request, response) =>
	response.json(
		await prisma.analystProfile.findMany({
			where: { status: 'APPROVED' },
			include: {
				user: { select: { username: true, fullName: true, avatarUrl: true } },
			},
		}),
	),
)
analystsRoutes.get('/:username', async (request, response) => {
	const profile = await prisma.analystProfile.findFirst({
		where: { status: 'APPROVED', user: { username: request.params.username } },
		include: {
			user: { select: { username: true, fullName: true, avatarUrl: true } },
		},
	})
	return profile
		? response.json(profile)
		: response.status(404).json({ error: 'المحلل غير موجود' })
})
analystsRoutes.post(
	'/:analystId/subscribe',
	requireAuth,
	async (request, response) => {
		if (request.userId === request.params.analystId)
			return response.status(400).json({ error: 'لا يمكنك الاشتراك في نفسك' })
		const analyst = await prisma.analystProfile.findFirst({
			where: { userId: request.params.analystId, status: 'APPROVED' },
		})
		if (!analyst) return response.status(404).json({ error: 'المحلل غير متاح' })
		const subscription = await prisma.analystSubscription.upsert({
			where: {
				subscriberId_analystId: {
					subscriberId: request.userId!,
					analystId: request.params.analystId,
				},
			},
			update: { status: 'ACTIVE' },
			create: {
				subscriberId: request.userId!,
				analystId: request.params.analystId,
			},
		})
		return response.status(201).json(subscription)
	},
)
analystsRoutes.delete(
	'/:analystId/subscribe',
	requireAuth,
	async (request, response) => {
		await prisma.analystSubscription.updateMany({
			where: {
				subscriberId: request.userId!,
				analystId: request.params.analystId,
			},
			data: { status: 'CANCELLED' },
		})
		return response.status(204).send()
	},
)
