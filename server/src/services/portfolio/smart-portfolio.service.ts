import { prisma } from '../../lib/prisma.js'
import { CandlesService } from '../market/candles.service.js'

type RiskProfile = 'CONSERVATIVE' | 'BALANCED' | 'AGGRESSIVE'
const defaults = ['COMI', 'ABUK', 'ETEL', 'SWDY', 'TMGH']
const allocations: Record<
	RiskProfile,
	{ stocks: number; gold: number; cash: number }
> = {
	CONSERVATIVE: { stocks: 40, gold: 40, cash: 20 },
	BALANCED: { stocks: 60, gold: 30, cash: 10 },
	AGGRESSIVE: { stocks: 80, gold: 15, cash: 5 },
}

async function valuePosition(symbol: string, quantity: number) {
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
		quantity,
		marketValue: price * quantity,
	}
}

export async function getSmartPortfolio(
	userId: string,
	riskProfile: RiskProfile = 'BALANCED',
) {
	const portfolio = await prisma.portfolio.findUnique({
		where: { userId },
		include: { positions: true },
	})
	const positions = await Promise.all(
		(portfolio?.positions ?? []).map((position) =>
			valuePosition(position.symbol, position.quantity),
		),
	)
	const total =
		(portfolio?.balance ?? 0) +
		positions.reduce((sum, item) => sum + item.marketValue, 0)
	const allocation = allocations[riskProfile]
	return {
		userId,
		riskProfile,
		allocation,
		holdings: positions,
		positions,
		totalValue: total,
		performance: {
			daily: 0,
			weekly: 0,
			monthly: 0,
			sinceInception: portfolio
				? ((total - portfolio.initialCapital) /
						Math.max(portfolio.initialCapital, 1)) *
					100
				: 0,
		},
		recommendations: positions.map((item) => ({
			symbol: item.symbol,
			targetWeight: positions.length ? allocation.stocks / positions.length : 0,
			action:
				item.marketValue / Math.max(total, 1) >
				allocation.stocks / 100 / Math.max(positions.length, 1)
					? 'REDUCE'
					: 'INCREASE',
		})),
		recommendation: 'خطة تعليمية غير تنفيذية؛ راجع التوزيع قبل أي قرار.',
		disclaimer: 'لا ينفذ هذا المسار صفقات حقيقية ولا يمثل توصية استثمارية.',
	}
}

export async function createSmartPortfolio(
	userId: string,
	riskProfile: RiskProfile = 'BALANCED',
) {
	const allocation = allocations[riskProfile]
	await prisma.portfolio.upsert({
		where: { userId },
		update: {},
		create: { userId, balance: 100000, initialCapital: 100000 },
	})
	return {
		...(await getSmartPortfolio(userId, riskProfile)),
		suggestedSymbols: defaults,
		allocation,
		created: true,
	}
}

export async function rebalancePlan(
	userId: string,
	riskProfile: RiskProfile = 'BALANCED',
) {
	return {
		...(await getSmartPortfolio(userId, riskProfile)),
		executed: false,
		action: 'PLAN_ONLY',
	}
}
