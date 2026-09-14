import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	applyCode,
	getOrCreateCode,
	stats,
} from '../services/referrals/referral.service.js'
export const referralsRoutes = Router()
referralsRoutes.get('/referrals', requireAuth, async (req, res) =>
	res.json(await stats(req.userId!)),
)
referralsRoutes.post('/referrals/code', requireAuth, async (req, res) =>
	res.json(await getOrCreateCode(req.userId!)),
)
referralsRoutes.post('/referrals/apply', requireAuth, async (req, res) => {
	const parsed = z.object({ code: z.string().min(6) }).safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'كود الإحالة مطلوب' })
	try {
		return res.status(201).json(await applyCode(req.userId!, parsed.data.code))
	} catch {
		return res.status(400).json({ error: 'كود الإحالة غير صالح أو مستخدم' })
	}
})
