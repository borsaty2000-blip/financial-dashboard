import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { createAnalystCheckout } from '../services/analyst/payment.service.js'
export const analystsRoutes = Router()
const profileSchema = z.object({
	displayName: z.string().min(2).max(80),
	bio: z.string().max(1000).optional(),
	specialties: z.array(z.string()).max(10).default([]),
	experience: z.number().int().min(0).max(80).default(0),
	credentials: z.array(z.string()).max(10).default([]),
	subscriptionPrice: z.number().min(0).max(100000).default(0),
})
const postSchema = z.object({
	symbol: z.string().max(20).optional(),
	type: z.enum(['ANALYSIS', 'TRADE_IDEA', 'NEWS_COMMENT']).default('ANALYSIS'),
	title: z.string().min(3).max(160),
	content: z.string().min(10).max(10000),
	charts: z.array(z.string().url()).max(8).default([]),
	sentiment: z.enum(['BULLISH', 'BEARISH', 'NEUTRAL']).optional(),
	isPremium: z.boolean().default(false),
})
analystsRoutes.get('/', async (_request, response) => {
	try {
		return response.json(
			await prisma.analystProfile.findMany({
				where: { status: 'APPROVED' },
				include: {
					user: { select: { username: true, fullName: true, avatarUrl: true } },
				},
			}),
		)
	} catch {
		return response.json([])
	}
})
analystsRoutes.post('/apply', requireAuth, async (request, response) => {
	const parsed = profileSchema.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات الطلب غير صالحة' })
	const profile = await prisma.analystProfile.upsert({
		where: { userId: request.userId! },
		update: { ...parsed.data, status: 'PENDING' },
		create: { userId: request.userId!, ...parsed.data },
	})
	return response
		.status(201)
		.json({ profile, message: 'تم استلام الطلب للمراجعة' })
})
analystsRoutes.put('/profile', requireAuth, async (request, response) => {
	const parsed = profileSchema.partial().safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'البيانات غير صالحة' })
	const profile = await prisma.analystProfile.update({
		where: { userId: request.userId! },
		data: parsed.data,
	})
	return response.json(profile)
})
analystsRoutes.get(
	'/my/subscriptions',
	requireAuth,
	async (request, response) =>
		response.json(
			await prisma.analystSubscription.findMany({
				where: { subscriberId: request.userId!, status: 'ACTIVE' },
				include: {
					analyst: {
						select: { username: true, fullName: true, avatarUrl: true },
					},
				},
			}),
		),
)
analystsRoutes.post('/posts', requireAuth, async (request, response) => {
	const parsed = postSchema.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات المنشور غير صالحة' })
	const profile = await prisma.analystProfile.findUnique({
		where: { userId: request.userId! },
	})
	if (!profile || profile.status !== 'APPROVED')
		return response.status(403).json({ error: 'يجب اعتماد ملف المحلل أولاً' })
	return response.status(201).json(
		await prisma.analystPost.create({
			data: { analystId: profile.id, ...parsed.data },
		}),
	)
})
analystsRoutes.get('/:username/posts', async (request, response) => {
	try {
		const profile = await prisma.analystProfile.findFirst({
			where: {
				status: 'APPROVED',
				user: { username: request.params.username },
			},
		})
		if (!profile)
			return response.status(404).json({ error: 'المحلل غير موجود' })
		const posts = await prisma.analystPost.findMany({
			where: { analystId: profile.id },
			orderBy: { createdAt: 'desc' },
		})
		return response.json(posts)
	} catch {
		return response.status(503).json({ error: 'بيانات المحللين غير متاحة' })
	}
})
analystsRoutes.put('/posts/:id', requireAuth, async (request, response) => {
	const profile = await prisma.analystProfile.findUnique({
		where: { userId: request.userId! },
	})
	if (!profile) return response.status(403).json({ error: 'ملف محلل مطلوب' })
	const parsed = postSchema.partial().safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'البيانات غير صالحة' })
	const post = await prisma.analystPost.updateMany({
		where: { id: request.params.id, analystId: profile.id },
		data: parsed.data,
	})
	return response.json({ updated: post.count })
})
analystsRoutes.delete('/posts/:id', requireAuth, async (request, response) => {
	const profile = await prisma.analystProfile.findUnique({
		where: { userId: request.userId! },
	})
	if (profile)
		await prisma.analystPost.deleteMany({
			where: { id: request.params.id, analystId: profile.id },
		})
	return response.status(204).send()
})
analystsRoutes.post(
	'/:username/subscribe',
	requireAuth,
	async (request, response) => {
		const analyst = await prisma.analystProfile.findFirst({
			where: {
				status: 'APPROVED',
				user: { username: request.params.username },
			},
		})
		if (!analyst) return response.status(404).json({ error: 'المحلل غير متاح' })
		const user = await prisma.user.findUnique({ where: { id: analyst.userId } })
		if (!user || user.id === request.userId)
			return response.status(400).json({ error: 'اشتراك غير صالح' })
		const subscription = await prisma.analystSubscription.upsert({
			where: {
				subscriberId_analystId: {
					subscriberId: request.userId!,
					analystId: analyst.userId,
				},
			},
			update: {
				status: 'ACTIVE',
				price: analyst.subscriptionPrice,
				startsAt: new Date(),
				endsAt: new Date(Date.now() + 30 * 86400000),
			},
			create: {
				subscriberId: request.userId!,
				analystId: analyst.userId,
				price: analyst.subscriptionPrice,
				startsAt: new Date(),
				endsAt: new Date(Date.now() + 30 * 86400000),
			},
		})
		return response.status(201).json({
			subscription,
			payment: {
				required: analyst.subscriptionPrice > 0,
				provider: 'Stripe/PayPal placeholder',
			},
		})
	},
)
analystsRoutes.delete(
	'/:username/subscribe',
	requireAuth,
	async (request, response) => {
		await prisma.analystSubscription.updateMany({
			where: {
				subscriberId: request.userId!,
				analyst: { username: request.params.username },
			},
			data: { status: 'CANCELLED', endsAt: new Date() },
		})
		return response.status(204).send()
	},
)
analystsRoutes.post(
	'/:username/checkout',
	requireAuth,
	async (request, response) => {
		const amount = Number(request.body.amount)
		if (!Number.isFinite(amount) || amount < 0)
			return response.status(400).json({ error: 'قيمة الدفع غير صالحة' })
		return response.json(
			await createAnalystCheckout({
				username: request.params.username,
				amount,
				currency: request.body.currency,
			}),
		)
	},
)
analystsRoutes.get('/:username', async (request, response) => {
	try {
		const profile = await prisma.analystProfile.findFirst({
			where: {
				status: 'APPROVED',
				user: { username: request.params.username },
			},
			include: {
				user: { select: { username: true, fullName: true, avatarUrl: true } },
				posts: { orderBy: { createdAt: 'desc' }, take: 10 },
			},
		})
		return profile
			? response.json(profile)
			: response.status(404).json({ error: 'المحلل غير موجود' })
	} catch {
		return response.status(503).json({ error: 'بيانات المحللين غير متاحة' })
	}
})
