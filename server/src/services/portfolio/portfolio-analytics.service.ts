import { prisma } from '../../lib/prisma.js'
import { CandlesService } from '../market/candles.service.js'

function average(values: number[]) {
	return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}
function std(values: number[]) {
	const mean = average(values)
	return Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
}
function maxDrawdown(returns: number[]) {
	let equity = 1
	let peak = 1
	let worst = 0
	for (const value of returns) {
		equity *= 1 + value
		peak = Math.max(peak, equity)
		worst = Math.min(worst, equity / peak - 1)
	}
	return Math.abs(worst)
}
function covariance(left: number[], right: number[]) {
	const n = Math.min(left.length, right.length)
	if (n < 2) return null
	const a = left.slice(-n)
	const b = right.slice(-n)
	const am = average(a)
	const bm = average(b)
	return average(a.map((value, index) => (value - am) * (b[index] - bm)))
}

export async function getPortfolioAnalytics(userId: string) {
	const [portfolio, orders] = await Promise.all([
		prisma.portfolio.findUnique({ where: { userId } }),
		prisma.order.findMany({
			where: { userId },
			orderBy: { executedAt: 'asc' },
		}),
	])
	const buys = orders.filter((order) => order.side === 'BUY')
	const sells = orders.filter((order) => order.side === 'SELL')
	const returns = sells
		.map((sell) => {
			const buy = [...buys]
				.reverse()
				.find(
					(candidate) =>
						candidate.symbol === sell.symbol &&
						candidate.executedAt <= sell.executedAt,
				)
			return buy ? (sell.price - buy.price) / buy.price : 0
		})
		.filter(Number.isFinite)
	const benchmark = await CandlesService.getCandles(
		'^CASE30',
		'EGX',
		'1d',
		Math.max(returns.length + 1, 30),
	).catch(() => ({ candles: [] as { close: number }[] }))
	const benchmarkReturns = benchmark.candles
		.slice(1)
		.map(
			(item, index) =>
				(item.close - benchmark.candles[index].close) /
				benchmark.candles[index].close,
		)
	const mean = average(returns)
	const deviation = std(returns)
	const downside = std(returns.filter((value) => value < 0))
	const cov = covariance(returns, benchmarkReturns)
	const variance = benchmarkReturns.length ? std(benchmarkReturns) ** 2 : 0
	const beta = cov != null && variance > 0 ? cov / variance : null
	const benchmarkMean = average(benchmarkReturns)
	const alpha = beta == null ? null : mean - beta * benchmarkMean
	return {
		available: returns.length > 0,
		tradeCount: returns.length,
		metrics: {
			sharpeRatio: deviation ? (mean / deviation) * Math.sqrt(252) : null,
			sortinoRatio: downside ? (mean / downside) * Math.sqrt(252) : null,
			maxDrawdown: maxDrawdown(returns),
			betaVsEGX30: beta,
			alpha,
			totalReturn:
				returns.reduce((equity, value) => equity * (1 + value), 1) - 1,
		},
		equityCurve: returns.reduce<{ index: number; value: number }[]>(
			(curve, value, index) => {
				const previous = curve.at(-1)?.value ?? 1
				curve.push({ index: index + 1, value: previous * (1 + value) })
				return curve
			},
			[],
		),
		allocation: portfolio
			? {
					cash: portfolio.balance,
					positions: 'متاحة عبر /api/trading/positions',
				}
			: null,
		disclaimer: 'تحليل تاريخي تعليمي لا يضمن الأداء المستقبلي.',
	}
}
