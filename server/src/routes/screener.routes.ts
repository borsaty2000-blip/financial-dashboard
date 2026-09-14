import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import {
	ScreenerService,
	screenerPresets,
} from '../services/screener/screener.service.js'

export const screenerRoutes = Router()
screenerRoutes.post('/scan', async (request, response) => {
	try {
		return response.json(await ScreenerService.scan(request.body ?? {}))
	} catch (error) {
		return response.status(502).json({
			available: false,
			error: error instanceof Error ? error.message : 'Screener unavailable',
		})
	}
})
screenerRoutes.get('/presets', (_request, response) =>
	response.json(screenerPresets),
)
screenerRoutes.get('/saved', requireAuth, async (request, response) =>
	response.json(
		await prisma.savedScreener.findMany({
			where: { userId: request.userId! },
			orderBy: { updatedAt: 'desc' },
		}),
	),
)
screenerRoutes.post('/save', requireAuth, async (request, response) => {
	const parsed = z
		.object({
			name: z.string().min(2).max(80),
			filters: z.record(z.string(), z.any()),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات الفلتر غير صالحة' })
	return response.status(201).json(
		await prisma.savedScreener.create({
			data: {
				userId: request.userId!,
				name: parsed.data.name,
				filters: parsed.data.filters,
			},
		}),
	)
})
screenerRoutes.post('/alert', requireAuth, async (request, response) => {
	const parsed = z
		.object({
			symbol: z.string().min(1).max(20),
			targetValue: z.number(),
			condition: z.string(),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'بيانات التنبيه غير صالحة' })
	return response.status(201).json(
		await prisma.priceAlert.create({
			data: {
				userId: request.userId!,
				symbol: parsed.data.symbol.toUpperCase(),
				targetValue: parsed.data.targetValue,
				condition: parsed.data.condition,
			},
		}),
	)
})
