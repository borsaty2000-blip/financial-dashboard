import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	createVideo,
	getVideo,
	listVideos,
	listWebinars,
	registerWebinar,
} from '../services/video/video.service.js'

export const videoRoutes = Router()
videoRoutes.get('/videos', async (req, res) =>
	res.json(
		await listVideos({
			category:
				typeof req.query.category === 'string' ? req.query.category : undefined,
			symbol:
				typeof req.query.symbol === 'string' ? req.query.symbol : undefined,
		}),
	),
)
videoRoutes.get('/videos/:id', async (req, res) => {
	try {
		return res.json(await getVideo(req.params.id))
	} catch {
		return res.status(404).json({ error: 'الفيديو غير موجود' })
	}
})
videoRoutes.post('/videos', requireAuth, async (req, res) => {
	const parsed = z
		.object({
			title: z.string().min(3),
			description: z.string().optional(),
			url: z.string().url(),
			thumbnail: z.string().url().optional(),
			duration: z.number().int().min(0),
			category: z.string(),
			symbol: z.string().optional(),
			isPremium: z.boolean().default(false),
		})
		.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات الفيديو غير صالحة' })
	return res.status(201).json(await createVideo(req.userId!, parsed.data))
})
videoRoutes.get('/webinars', async (_req, res) =>
	res.json(await listWebinars()),
)
videoRoutes.post('/webinars/register', requireAuth, async (req, res) => {
	const id = z.string().safeParse(req.body.webinarId)
	if (!id.success) return res.status(400).json({ error: 'معرف الندوة مطلوب' })
	try {
		return res.json(await registerWebinar(id.data))
	} catch {
		return res.status(404).json({ error: 'الندوة غير موجودة' })
	}
})
