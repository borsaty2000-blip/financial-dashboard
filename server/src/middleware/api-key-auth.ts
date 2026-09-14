import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../lib/prisma.js'
import {
	tierLimits,
	validateKey,
} from '../services/developer/api-key.service.js'
const memory = new Map<string, { day: number; dayAt: number }>()
export async function apiKeyAuthV1(
	request: Request,
	response: Response,
	next: NextFunction,
) {
	const raw = request.header('x-api-key')
	if (!raw?.startsWith('bors_'))
		return response.status(401).json({ error: 'أرسل المفتاح في X-API-Key' })
	let key
	try {
		key = await validateKey(raw)
	} catch {
		return response.status(503).json({ error: 'خدمة مفاتيح API غير متاحة' })
	}
	if (!key)
		return response.status(401).json({ error: 'مفتاح API غير صالح أو منتهي' })
	const limit = tierLimits(key.tier)
	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)
	try {
		const usedToday = await prisma.apiUsageLog.count({
			where: { apiKeyId: key.id, createdAt: { gte: today } },
		})
		if (usedToday >= limit.daily)
			return response
				.status(429)
				.json({
					error: 'تم تجاوز الحد اليومي',
					tier: key.tier,
					dailyLimit: limit.daily,
				})
	} catch {
		const current = memory.get(key.id)
		const now = Date.now()
		if (!current || current.dayAt < now - 86400000)
			memory.set(key.id, { day: 1, dayAt: now })
		else if (current.day >= limit.daily)
			return response
				.status(429)
				.json({ error: 'تم تجاوز الحد اليومي', tier: key.tier })
	}
	request.userId = key.userId
	const started = Date.now()
	response.on('finish', () => {
		void prisma.apiUsageLog
			.create({
				data: {
					apiKeyId: key!.id,
					endpoint: request.originalUrl,
					method: request.method,
					statusCode: response.statusCode,
					latencyMs: Date.now() - started,
					ipAddress: request.ip,
					userAgent: request.get('user-agent'),
				},
			})
			.catch(() => undefined)
	})
	next()
}
