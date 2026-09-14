import { Router } from 'express'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import {
	getDividends,
	getEarnings,
	getIPO,
	getSplits,
} from '../services/calendar/specialized.service.js'

export const specializedCalendarRoutes = Router()
specializedCalendarRoutes.get('/ipo', async (_request, response) => {
	const data = await getIPO(false)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.get('/ipo/upcoming', async (_request, response) => {
	const data = await getIPO(true)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.post(
	'/ipo',
	requireAdmin,
	async (request, response) => {
		try {
			const body = request.body
			const data = await prisma.iPOEvent.create({
				data: {
					symbol: body.symbol,
					companyName: body.companyName,
					nameAr: body.nameAr ?? body.companyName,
					market: body.market ?? 'EGX',
					ipoDate: new Date(body.ipoDate),
					priceRange: body.priceRange,
					sharesOffered: BigInt(body.sharesOffered),
					totalValue: Number(body.totalValue),
					status: body.status ?? 'UPCOMING',
					subscriptionStart: body.subscriptionStart
						? new Date(body.subscriptionStart)
						: null,
					subscriptionEnd: body.subscriptionEnd
						? new Date(body.subscriptionEnd)
						: null,
				},
			})
			return response
				.status(201)
				.json(
					JSON.parse(
						JSON.stringify(data, (_key, value) =>
							typeof value === 'bigint' ? value.toString() : value,
						),
					),
				)
		} catch (error) {
			return response
				.status(400)
				.json({ error: error instanceof Error ? error.message : 'IPO invalid' })
		}
	},
)
specializedCalendarRoutes.get('/dividends', async (request, response) => {
	const data = await getDividends(
		typeof request.query.symbol === 'string' ? request.query.symbol : undefined,
		request.query.upcoming === 'true',
	)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.get(
	'/dividends/upcoming',
	async (_request, response) => {
		const data = await getDividends(undefined, true)
		return response.json({ data, count: data.length })
	},
)
specializedCalendarRoutes.get(
	'/dividends/:symbol',
	async (request, response) => {
		const data = await getDividends(request.params.symbol)
		return response.json({ data, count: data.length })
	},
)
specializedCalendarRoutes.get('/earnings', async (request, response) => {
	const data = await getEarnings(
		typeof request.query.symbol === 'string' ? request.query.symbol : undefined,
		request.query.upcoming === 'true',
	)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.get(
	'/earnings/upcoming',
	async (_request, response) => {
		const data = await getEarnings(undefined, true)
		return response.json({ data, count: data.length })
	},
)
specializedCalendarRoutes.get(
	'/earnings/:symbol',
	async (request, response) => {
		const data = await getEarnings(request.params.symbol)
		return response.json({ data, count: data.length })
	},
)
specializedCalendarRoutes.get('/splits', async (request, response) => {
	const data = await getSplits(
		typeof request.query.symbol === 'string' ? request.query.symbol : undefined,
	)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.get('/splits/:symbol', async (request, response) => {
	const data = await getSplits(request.params.symbol)
	return response.json({ data, count: data.length })
})
specializedCalendarRoutes.post(
	'/reminders',
	requireAuth,
	async (request, response) =>
		response.status(201).json({
			enabled: true,
			symbol: String(request.body.symbol ?? '').toUpperCase(),
			eventType: request.body.eventType ?? 'earnings',
			message: 'تم تفعيل التذكير التعليمي',
		}),
)
