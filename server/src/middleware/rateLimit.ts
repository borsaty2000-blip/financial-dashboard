import type { NextFunction, Request, Response } from 'express'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
export function rateLimit(max: number, windowMs: number, name: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		const key = `${name}:${req.ip}`
		const now = Date.now()
		const current = buckets.get(key)
		const bucket =
			!current || current.resetAt <= now
				? { count: 0, resetAt: now + windowMs }
				: current
		bucket.count += 1
		buckets.set(key, bucket)
		res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count))
		if (bucket.count > max)
			return res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً' })
		next()
	}
}
export const authRateLimit = rateLimit(5, 15 * 60 * 1000, 'auth')
export const loginRateLimit = rateLimit(10, 15 * 60 * 1000, 'login')
export const forgotRateLimit = rateLimit(3, 60 * 60 * 1000, 'forgot')
export const resetRateLimit = rateLimit(5, 60 * 60 * 1000, 'reset')
export const publicRateLimit = rateLimit(100, 15 * 60 * 1000, 'public')
