import { createHash, randomBytes } from 'node:crypto'
import { Router, type NextFunction, type Request, type Response } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { CandlesService } from '../services/market/candles.service.js'

export const developerRoutes = Router()
export const developerApiRoutes = Router()
const requests = new Map<string, { count: number; resetAt: number }>()
function hash(value: string) {
	return createHash('sha256').update(value).digest('hex')
}

export async function apiKeyAuth(
	request: Request,
	response: Response,
	next: NextFunction,
) {
	const raw =
		request.header('x-api-key') ??
		request.headers.authorization?.replace(/^Bearer\s+/i, '')
	if (!raw?.startsWith('brs_'))
		return response.status(401).json({ error: 'x-api-key مطلوب' })
	const current = requests.get(raw)
	const now = Date.now()
	if (current && current.resetAt > now && current.count >= 60)
		return response
			.status(429)
			.json({ error: 'تم تجاوز حد 60 طلباً في الدقيقة' })
	if (!current || current.resetAt <= now)
		requests.set(raw, { count: 1, resetAt: now + 60_000 })
	else current.count += 1
	const key = await prisma.apiKey.findFirst({
		where: { keyHash: hash(raw), revokedAt: null },
	})
	if (!key) return response.status(401).json({ error: 'مفتاح API غير صالح' })
	await prisma.apiKey
		.update({
			where: { id: key.id },
			data: { lastUsedAt: new Date(), requestCount: { increment: 1 } },
		})
		.catch(() => undefined)
	request.userId = key.userId
	next()
}

developerApiRoutes.use(apiKeyAuth)
developerApiRoutes.get('/quote/:symbol', async (request, response) => {
	try {
		const data = await CandlesService.getCandles(
			request.params.symbol,
			'EGX',
			'1d',
			2,
		)
		return response.json({
			symbol: request.params.symbol.toUpperCase(),
			candle: data.candles.at(-1) ?? null,
			available: Boolean(data.candles.length),
			source: data.source,
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Quote unavailable',
		})
	}
})

developerRoutes.use(requireAuth)
developerRoutes.get('/keys', async (request, response) =>
	response.json(
		await prisma.apiKey.findMany({
			where: { userId: request.userId!, revokedAt: null },
			select: {
				id: true,
				name: true,
				keyPrefix: true,
				requestCount: true,
				lastUsedAt: true,
				createdAt: true,
			},
		}),
	),
)
developerRoutes.post('/keys', async (request, response) => {
	const parsed = z
		.object({ name: z.string().min(2).max(80) })
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'اسم المفتاح غير صالح' })
	const raw = `brs_${randomBytes(24).toString('hex')}`
	const key = await prisma.apiKey.create({
		data: {
			userId: request.userId!,
			name: parsed.data.name,
			keyHash: hash(raw),
			keyPrefix: raw.slice(0, 12),
		},
	})
	return response.status(201).json({
		id: key.id,
		name: key.name,
		key: raw,
		warning: 'احفظ المفتاح الآن؛ لن يظهر كاملاً مرة أخرى.',
	})
})
developerRoutes.delete('/keys/:id', async (request, response) => {
	await prisma.apiKey.updateMany({
		where: { id: request.params.id, userId: request.userId! },
		data: { revokedAt: new Date() },
	})
	return response.status(204).send()
})
developerRoutes.get('/usage', async (request, response) =>
	response.json(
		await prisma.apiKey.findMany({
			where: { userId: request.userId! },
			select: {
				name: true,
				keyPrefix: true,
				requestCount: true,
				lastUsedAt: true,
				revokedAt: true,
			},
		}),
	),
)
developerRoutes.post('/analysts/apply', async (request, response) => {
	const parsed = z
		.object({
			displayName: z.string().min(2).max(80),
			bio: z.string().max(1000).optional(),
			specialties: z.array(z.string()).max(10).default([]),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات الطلب غير صالحة' })
	const profile = await prisma.analystProfile.upsert({
		where: { userId: request.userId! },
		update: { ...parsed.data, status: 'PENDING' },
		create: { userId: request.userId!, ...parsed.data },
	})
	return response
		.status(201)
		.json({ profile, message: 'تم استلام الطلب للمراجعة' })
})
