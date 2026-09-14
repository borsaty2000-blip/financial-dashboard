import type { NextFunction, Request, Response } from 'express'
import { verifyToken } from '../config/jwt.js'

declare global {
	namespace Express {
		interface Request {
			userId?: string
		}
	}
}
export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
	if (!token) return res.status(401).json({ error: 'رمز الوصول مطلوب' })
	try {
		const payload = await verifyToken(token, 'access')
		req.userId = payload.sub
		next()
	} catch {
		res.status(401).json({ error: 'رمز الوصول غير صالح أو منتهي' })
	}
}

export async function requireAdmin(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	await requireAuth(req, res, () => {
		const allowed = (process.env.ADMIN_USER_IDS ?? '')
			.split(',')
			.map((item) => item.trim())
			.filter(Boolean)
		if (!req.userId || !allowed.includes(req.userId))
			return res.status(403).json({ error: 'صلاحيات الإدارة مطلوبة' })
		next()
	})
}
