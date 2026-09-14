import { prisma } from '../../lib/prisma.js'

export async function getDigitalTwin(userId: string) {
	const [preferences, watchlists, alerts, orders] = await Promise.all([
		prisma.userPreference.findUnique({ where: { userId } }),
		prisma.watchlist.findMany({ where: { userId }, include: { items: true } }),
		prisma.priceAlert.count({ where: { userId, isActive: true } }),
		prisma.order.findMany({
			where: { userId },
			orderBy: { executedAt: 'asc' },
		}),
	])
	const symbols = [
		...new Set(
			watchlists.flatMap((list) => list.items.map((item) => item.symbol)),
		),
	]
	const buys = orders.filter((order) => order.side === 'BUY')
	const sells = orders.filter((order) => order.side === 'SELL')
	const avgBuyAmount = buys.length
		? buys.reduce((sum, order) => sum + order.totalCost, 0) / buys.length
		: 0
	const wins = sells.filter((sell) => {
		const buy = [...buys]
			.reverse()
			.find(
				(candidate) =>
					candidate.symbol === sell.symbol &&
					candidate.executedAt <= sell.executedAt,
			)
		return Boolean(buy && sell.price > buy.price)
	}).length
	const winRate = sells.length ? wins / sells.length : 0
	const avgHoldingPeriod = sells.length
		? sells.reduce((sum, sell) => {
				const buy = [...buys]
					.reverse()
					.find(
						(candidate) =>
							candidate.symbol === sell.symbol &&
							candidate.executedAt <= sell.executedAt,
					)
				return (
					sum +
					(buy
						? (sell.executedAt.getTime() - buy.executedAt.getTime()) / 86400000
						: 0)
				)
			}, 0) / sells.length
		: 0
	const riskTolerance =
		orders.length > 20 ? 'HIGH' : orders.length > 5 ? 'MEDIUM' : 'LOW'
	const insights = [
		avgHoldingPeriod
			? `متوسط فترة الاحتفاظ ${avgHoldingPeriod.toFixed(1)} يوماً`
			: 'لا توجد صفقات بيع كافية لحساب فترة الاحتفاظ',
		`متوسط قيمة الشراء ${avgBuyAmount.toFixed(2)}`,
		`معدل النجاح المحسوب ${Math.round(winRate * 100)}%`,
	]
	return {
		userId,
		profile: {
			experienceLevel: preferences?.experienceLevel ?? 'BEGINNER',
			investmentStyle: preferences?.investmentStyle ?? 'BALANCED',
		},
		behavior: {
			avgHoldingPeriod,
			avgBuyAmount,
			preferredSectors: preferences?.preferredSectors ?? [],
			riskTolerance,
			winRate,
			favoriteTimeToTrade: 'غير متاح دون سجل زمني كافٍ',
			watchlistSymbols: symbols,
			activeAlerts: alerts,
			orderCount: orders.length,
			activityLevel:
				orders.length > 10 ? 'ACTIVE' : orders.length ? 'REGULAR' : 'NEW',
		},
		insights,
		recommendations: [
			'نوّع المحفظة تدريجياً',
			'استخدم حدود مخاطر واضحة',
			'راجع الأداء قبل زيادة حجم الصفقة',
		],
		disclaimer: 'التوأم الرقمي وصف سلوكي تعليمي وليس تقييماً نفسياً أو توصية.',
	}
}
