import { prisma } from '../../lib/prisma.js'
import { CandlesService } from '../market/candles.service.js'

export async function getSmartPortfolio(userId: string) {
	const portfolio = await prisma.portfolio.findUnique({
		where: { userId },
		include: { positions: true },
	})
	const symbols = portfolio?.positions.map((position) => position.symbol) ?? []
	const positions = await Promise.all(
		symbols.map(async (symbol) => {
			const candles = await CandlesService.getCandles(
				symbol,
				'EGX',
				'1d',
				30,
			).catch(() => ({ candles: [] as { close: number }[] }))
			const price = candles.candles.at(-1)?.close ?? 0
			return {
				symbol,
				currentPrice: price,
				marketValue:
					price *
					(portfolio?.positions.find((item) => item.symbol === symbol)
						?.quantity ?? 0),
			}
		}),
	)
	const total =
		(portfolio?.balance ?? 0) +
		positions.reduce((sum, item) => sum + item.marketValue, 0)
	const targetWeight = positions.length ? 1 / positions.length : 0
	return {
		available: true,
		portfolioValue: total,
		positions,
		recommendations: positions.map((item) => ({
			symbol: item.symbol,
			targetWeight: targetWeight * 100,
			action:
				item.marketValue / Math.max(total, 1) > targetWeight
					? 'REDUCE'
					: 'INCREASE',
		})),
		disclaimer: 'اقتراح توزيع تعليمي فقط؛ لا ينفذ أوامر تداول.',
	}
}

export async function rebalancePlan(userId: string) {
	return getSmartPortfolio(userId)
}
