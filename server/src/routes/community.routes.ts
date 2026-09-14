import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	categories,
	createReply,
	createTopic,
	deleteTopic,
	likeReply,
	acceptReply,
	leaderboard,
	topic,
	topics,
	updateReply,
	updateTopic,
} from '../services/community/community.service.js'

export const communityRoutes = Router()
const topicSchema = z.object({
	categoryId: z.string().min(1),
	title: z.string().min(4).max(160),
	content: z.string().min(10).max(10000),
	tags: z.array(z.string()).max(8).default([]),
})
communityRoutes.get('/forum/categories', async (_req, res) =>
	res.json(await categories()),
)
communityRoutes.get('/forum/topics', async (req, res) =>
	res.json(
		await topics(
			typeof req.query.category === 'string' ? req.query.category : undefined,
		),
	),
)
communityRoutes.get('/forum/topics/:id', async (req, res) => {
	try {
		return res.json(await topic(req.params.id))
	} catch {
		return res.status(404).json({ error: 'الموضوع غير موجود' })
	}
})
communityRoutes.post('/forum/topics', requireAuth, async (req, res) => {
	const parsed = topicSchema.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات الموضوع غير صالحة' })
	return res.status(201).json(await createTopic(req.userId!, parsed.data))
})

communityRoutes.put('/forum/topics/:id', requireAuth, async (req, res) => {
	const parsed = topicSchema.partial().safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات الموضوع غير صالحة' })
	try {
		return res.json(await updateTopic(req.userId!, req.params.id, parsed.data))
	} catch {
		return res.status(403).json({ error: 'لا تملك صلاحية التعديل' })
	}
})
communityRoutes.delete('/forum/topics/:id', requireAuth, async (req, res) => {
	try {
		await deleteTopic(req.userId!, req.params.id)
		return res.status(204).send()
	} catch {
		return res.status(403).json({ error: 'لا تملك صلاحية الحذف' })
	}
})
communityRoutes.post(
	'/forum/topics/:id/replies',
	requireAuth,
	async (req, res) => {
		const content = z.string().min(2).max(5000).safeParse(req.body.content)
		if (!content.success)
			return res.status(400).json({ error: 'الرد غير صالح' })
		return res
			.status(201)
			.json(await createReply(req.userId!, req.params.id, content.data))
	},
)
communityRoutes.put('/forum/replies/:id', requireAuth, async (req, res) => {
	const content = z.string().min(2).max(5000).safeParse(req.body.content)
	if (!content.success) return res.status(400).json({ error: 'الرد غير صالح' })
	try {
		return res.json(await updateReply(req.userId!, req.params.id, content.data))
	} catch {
		return res.status(403).json({ error: 'لا تملك صلاحية التعديل' })
	}
})
communityRoutes.post(
	'/forum/replies/:id/like',
	requireAuth,
	async (req, res) => {
		try {
			return res.json(await likeReply(req.params.id))
		} catch {
			return res.status(404).json({ error: 'الرد غير موجود' })
		}
	},
)
communityRoutes.post(
	'/forum/replies/:id/accept',
	requireAuth,
	async (req, res) => {
		try {
			return res.json(await acceptReply(req.userId!, req.params.id))
		} catch {
			return res.status(403).json({ error: 'لا تملك صلاحية قبول الإجابة' })
		}
	},
)
communityRoutes.get('/reputation', requireAuth, async (req, res) =>
	res.json(await prismaReputation(req.userId!)),
)
communityRoutes.get('/reputation/leaderboard', async (_req, res) =>
	res.json(await leaderboard()),
)
async function prismaReputation(userId: string) {
	const { prisma } = await import('../lib/prisma.js')
	return prisma.userReputation.findUnique({ where: { userId } })
}
