import { prisma } from '../../lib/prisma.js'
import { CandlesService } from '../market/candles.service.js'
import { getPortfolioValue } from '../trading.service.js'
import { sendPush } from '../notifications/push.service.js'

function weekStart() {
	const date = new Date()
	date.setUTCHours(0, 0, 0, 0)
	date.setUTCDate(date.getUTCDate() - date.getUTCDay())
	return date
}

export async function buildWeeklyDigest(userId: string) {
	const [portfolio, preferences, watchlists, alerts] = await Promise.all([
		getPortfolioValue(userId).catch(() => null),
		prisma.userPreference.findUnique({ where: { userId } }),
		prisma.watchlist.findMany({ where: { userId }, include: { items: true } }),
		prisma.priceAlert.findMany({ where: { userId, isActive: true }, take: 10 }),
	])
	const symbols = [
		...new Set(
			watchlists.flatMap((list) => list.items.map((item) => item.symbol)),
		),
	]
	const opportunities = await Promise.all(
		symbols.slice(0, 5).map(async (symbol) => {
			const data = await CandlesService.getCandles(
				symbol,
				'EGX',
				'1d',
				30,
			).catch(() => ({ candles: [] as { close: number }[] }))
			const prices = data.candles.map((candle) => candle.close)
			const change =
				prices.length > 1
					? ((prices.at(-1)! - prices[0]) / prices[0]) * 100
					: null
			return { symbol, changePercent: change, available: change !== null }
		}),
	)
	const digest = {
		period: weekStart().toISOString().slice(0, 10),
		portfolio,
		preferences: preferences
			? {
					preferredMarkets: preferences.preferredMarkets,
					investmentStyle: preferences.investmentStyle,
				}
			: null,
		opportunities: opportunities.filter((item) => item.available),
		risks: alerts.map((alert) => ({
			symbol: alert.symbol,
			condition: alert.condition,
			targetValue: alert.targetValue,
		})),
		marketSummary: {
			available: false,
			message: 'يُعرض فقط عند توفر مصدر سوق موحد.',
		},
		generatedAt: new Date().toISOString(),
		disclaimer: 'تقرير تعليمي مبني على البيانات المتاحة وليس توصية استثمارية.',
	}
	await prisma.notification
		.create({
			data: {
				userId,
				type: 'WEEKLY_DIGEST',
				title: 'تقرير بورصتي الأسبوعي',
				body: JSON.stringify(digest),
				link: '/reports/weekly',
			},
		})
		.catch(() => undefined)
	void sendPush(userId, {
		title: 'تقرير بورصتي الأسبوعي جاهز',
		body: 'افتح التقرير لمراجعة الأداء والفرص والمخاطر.',
		link: '/reports/weekly',
	})
	return digest
}

export async function getWeeklyDigest(userId: string) {
	return buildWeeklyDigest(userId)
}
export async function getWeeklyHistory(userId: string) {
	const records = await prisma.notification.findMany({
		where: { userId, type: 'WEEKLY_DIGEST' },
		orderBy: { createdAt: 'desc' },
		take: 12,
	})
	return records.map((record) => ({
		id: record.id,
		createdAt: record.createdAt,
		data: JSON.parse(record.body),
	}))
}
