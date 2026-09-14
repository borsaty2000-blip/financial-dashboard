import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import {
	addMember,
	applyOrganization,
	getOrganization,
	removeMember,
} from '../services/enterprise/organization.service.js'

export const enterpriseRoutes = Router()
const orgSchema = z.object({
	name: z.string().min(2),
	nameEn: z.string().optional(),
	type: z.enum(['ACADEMY', 'BROKER', 'FUND', 'UNIVERSITY']),
	contactEmail: z.string().email(),
	contactPhone: z.string().optional(),
	website: z.string().url().optional(),
})
enterpriseRoutes.post('/organizations/apply', requireAuth, async (req, res) => {
	const parsed = orgSchema.safeParse(req.body)
	if (!parsed.success)
		return res.status(400).json({ error: 'بيانات المؤسسة غير صالحة' })
	return res.status(201).json(await applyOrganization(req.userId!, parsed.data))
})
enterpriseRoutes.get('/organizations/:id', requireAuth, async (req, res) => {
	const org = await getOrganization(req.params.id)
	return org
		? res.json(org)
		: res.status(404).json({ error: 'المؤسسة غير موجودة' })
})
enterpriseRoutes.post(
	'/organizations/:id/members',
	requireAuth,
	async (req, res) => {
		const parsed = z
			.object({
				userId: z.string().uuid(),
				role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
			})
			.safeParse(req.body)
		if (!parsed.success)
			return res.status(400).json({ error: 'بيانات العضو غير صالحة' })
		try {
			return res
				.status(201)
				.json(
					await addMember(
						req.params.id,
						req.userId!,
						parsed.data.userId,
						parsed.data.role,
					),
				)
		} catch {
			return res.status(403).json({ error: 'لا تملك صلاحية الإدارة' })
		}
	},
)
enterpriseRoutes.delete(
	'/organizations/:id/members/:userId',
	requireAuth,
	async (req, res) => {
		try {
			await removeMember(req.params.id, req.userId!, req.params.userId)
			return res.status(204).send()
		} catch {
			return res.status(403).json({ error: 'لا تملك صلاحية الإدارة' })
		}
	},
)
