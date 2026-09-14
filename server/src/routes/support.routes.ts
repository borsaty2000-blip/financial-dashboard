import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	addMessage,
	createTicket,
	getTicket,
	listTickets,
	updateTicketStatus,
} from '../services/support/ticket.service.js'
import {
	getArticle,
	listArticles,
	rateArticle,
} from '../services/support/knowledge.service.js'

export const supportRoutes = Router()
const ticketSchema = z.object({
	subject: z.string().min(3).max(160),
	category: z.enum(['BUG', 'FEATURE', 'BILLING', 'ACCOUNT', 'OTHER']),
	priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
	content: z.string().min(5).max(10000),
})
const messageSchema = z.object({ content: z.string().min(1).max(10000) })

supportRoutes.post('/support/tickets', requireAuth, async (req, res) => {
	const parsed = ticketSchema.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات التذكرة غير صالحة' })
	return res.status(201).json(await createTicket(req.userId!, parsed.data))
})
supportRoutes.get('/support/tickets', requireAuth, async (req, res) =>
	res.json(await listTickets(req.userId!)),
)
supportRoutes.get('/support/tickets/:id', requireAuth, async (req, res) => {
	const ticket = await getTicket(req.userId!, req.params.id)
	return ticket
		? res.json(ticket)
		: res.status(404).json({ error: 'التذكرة غير موجودة' })
})
supportRoutes.post(
	'/support/tickets/:id/messages',
	requireAuth,
	async (req, res) => {
		const parsed = messageSchema.safeParse(req.body)
		if (!parsed.success)
			return res.status(400).json({ error: 'الرسالة غير صالحة' })
		return res
			.status(201)
			.json(await addMessage(req.userId!, req.params.id, parsed.data.content))
	},
)
supportRoutes.put(
	'/support/tickets/:id/status',
	requireAuth,
	async (req, res) => {
		const status = z
			.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED'])
			.safeParse(req.body.status)
		if (!status.success)
			return res.status(400).json({ error: 'الحالة غير صالحة' })
		return res.json(
			await updateTicketStatus(req.userId!, req.params.id, status.data),
		)
	},
)
supportRoutes.get('/knowledge/articles', async (req, res) =>
	res.json(
		await listArticles(
			typeof req.query.category === 'string' ? req.query.category : undefined,
			typeof req.query.q === 'string' ? req.query.q : undefined,
		),
	),
)
supportRoutes.get('/knowledge/search', async (req, res) =>
	res.json(
		await listArticles(
			undefined,
			typeof req.query.q === 'string' ? req.query.q : undefined,
		),
	),
)
supportRoutes.get('/knowledge/articles/:slug', async (req, res) => {
	const article = await getArticle(req.params.slug)
	return article
		? res.json(article)
		: res.status(404).json({ error: 'المقال غير موجود' })
})
supportRoutes.post('/knowledge/articles/:slug/rate', async (req, res) => {
	const helpful = z.boolean().safeParse(req.body.helpful)
	if (!helpful.success)
		return res.status(400).json({ error: 'التقييم غير صالح' })
	return res.json(await rateArticle(req.params.slug, helpful.data))
})
supportRoutes.post('/support/live-chat', async (req, res) => {
	const message = z.string().min(1).max(2000).safeParse(req.body.message)
	if (!message.success)
		return res.status(400).json({ error: 'الرسالة غير صالحة' })
	return res.json({
		mode: 'chatbot',
		available: true,
		reply:
			'مرحباً بك في دعم بورصتي. ابدأ بالبحث في مركز المساعدة أو افتح تذكرة وسيتابعها الفريق.',
		message: message.data,
	})
})
