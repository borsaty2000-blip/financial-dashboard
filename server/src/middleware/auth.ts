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
