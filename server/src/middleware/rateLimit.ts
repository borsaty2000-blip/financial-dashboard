import type { NextFunction, Request, Response } from 'express'

type Bucket = { count: number; resetAt: number }
const buckets = new Map<string, Bucket>()
export function rateLimit(max: number, windowMs: number, name: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		const key = `${name}:${req.ip ?? req.socket.remoteAddress ?? 'unknown'}`
		const now = Date.now()
		const current = buckets.get(key)
		const bucket =
			!current || current.resetAt <= now
				? { count: 0, resetAt: now + windowMs }
				: current
		bucket.count += 1
		buckets.set(key, bucket)
		res.setHeader('X-RateLimit-Remaining', Math.max(0, max - bucket.count))
		if (bucket.count > max) {
			res.setHeader(
				'Retry-After',
				Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
			)
			return res.status(429).json({ error: 'طلبات كثيرة، حاول لاحقاً' })
		}
		next()
	}
}
export const authRateLimit = rateLimit(5, 15 * 60 * 1000, 'auth')
export const loginRateLimit = rateLimit(10, 15 * 60 * 1000, 'login')
export const forgotRateLimit = rateLimit(3, 60 * 60 * 1000, 'forgot')
export const resetRateLimit = rateLimit(5, 60 * 60 * 1000, 'reset')
export const publicRateLimit = rateLimit(100, 15 * 60 * 1000, 'public')
export const analysisRateLimit = rateLimit(30, 60 * 1000, 'analysis')
export const webhookRateLimit = rateLimit(60, 60 * 1000, 'webhook')
