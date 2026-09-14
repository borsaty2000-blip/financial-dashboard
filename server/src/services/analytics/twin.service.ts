import { prisma } from '../../lib/prisma.js'

export async function getDigitalTwin(userId: string) {
	const [preferences, watchlists, alerts, orders] = await Promise.all([
		prisma.userPreference.findUnique({ where: { userId } }),
		prisma.watchlist.findMany({ where: { userId }, include: { items: true } }),
		prisma.priceAlert.count({ where: { userId, isActive: true } }),
		prisma.order.count({ where: { userId } }),
	])
	const symbols = watchlists.flatMap((list) =>
		list.items.map((item) => item.symbol),
	)
	return {
		userId,
		profile: {
			experienceLevel: preferences?.experienceLevel ?? 'BEGINNER',
			investmentStyle: preferences?.investmentStyle ?? 'BALANCED',
		},
		behavior: {
			watchlistSymbols: [...new Set(symbols)],
			activeAlerts: alerts,
			orderCount: orders,
			activityLevel: orders > 10 ? 'ACTIVE' : orders > 0 ? 'REGULAR' : 'NEW',
		},
		disclaimer: 'التوأم الرقمي وصف سلوكي تعليمي وليس تقييماً نفسياً أو توصية.',
	}
}
