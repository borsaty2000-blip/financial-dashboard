import { Router } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth.js'
import {
	createDistributionDraft,
	distributionStatus,
} from '../services/marketing/distribution.service.js'

export const marketingRoutes = Router()
marketingRoutes.get(
	'/marketing/distribution/status',
	requireAdmin,
	(_req, res) => res.json(distributionStatus()),
)
marketingRoutes.post(
	'/marketing/distribution/draft',
	requireAdmin,
	(req, res) => {
		const parsed = z
			.object({
				title: z.string().min(3),
				excerpt: z.string().optional(),
				content: z.string().min(30),
				slug: z.string().min(2),
			})
			.safeParse(req.body)
		if (!parsed.success)
			return res.status(400).json({ error: 'بيانات المسودة غير صالحة' })
		return res.json(createDistributionDraft(parsed.data))
	},
)
