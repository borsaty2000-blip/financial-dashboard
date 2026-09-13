import { prisma } from '../lib/prisma.js'
import { CandlesService } from './market/candles.service.js'

async function priceFor(symbol: string) {
	const data = await CandlesService.getCandles(symbol, 'EGX', '1d', 2)
	const price = data.candles.at(-1)?.close
	if (!price) throw new Error('لا يوجد سعر متاح للسهم')
	return price
}

async function portfolioFor(userId: string) {
	return prisma.portfolio.upsert({
		where: { userId },
		update: {},
		create: { userId },
		include: { positions: true },
	})
}

export async function executeBuy(
	userId: string,
	symbol: string,
	quantity: number,
) {
	const normalized = symbol.toUpperCase()
	const price = await priceFor(normalized)
	const totalCost = price * quantity
	return prisma.$transaction(async (tx) => {
		const portfolio = await tx.portfolio.upsert({
			where: { userId },
			update: {},
			create: { userId },
			include: { positions: true },
		})
		if (portfolio.balance < totalCost)
			throw new Error('الرصيد الافتراضي غير كافٍ')
		const current = portfolio.positions.find(
			(position) => position.symbol === normalized,
		)
		const newQuantity = (current?.quantity ?? 0) + quantity
		const avgPrice = current
			? (current.avgPrice * current.quantity + totalCost) / newQuantity
			: price
		await tx.portfolio.update({
			where: { id: portfolio.id },
			data: { balance: { decrement: totalCost } },
		})
		await tx.position.upsert({
			where: {
				portfolioId_symbol: { portfolioId: portfolio.id, symbol: normalized },
			},
			update: { quantity: newQuantity, avgPrice },
			create: {
				portfolioId: portfolio.id,
				symbol: normalized,
				quantity,
				avgPrice,
			},
		})
		return tx.order.create({
			data: {
				userId,
				portfolioId: portfolio.id,
				symbol: normalized,
				side: 'BUY',
				quantity,
				price,
				totalCost,
			},
		})
	})
}

export async function executeSell(
	userId: string,
	symbol: string,
	quantity: number,
) {
	const normalized = symbol.toUpperCase()
	const price = await priceFor(normalized)
	return prisma.$transaction(async (tx) => {
		const portfolio = await tx.portfolio.findUnique({
			where: { userId },
			include: { positions: true },
		})
		const current = portfolio?.positions.find(
			(position) => position.symbol === normalized,
		)
		if (!portfolio || !current || current.quantity < quantity)
			throw new Error('الكمية المتاحة للبيع غير كافية')
		const totalCost = price * quantity
		const realizedPnl = (price - current.avgPrice) * quantity
		await tx.portfolio.update({
			where: { id: portfolio.id },
			data: { balance: { increment: totalCost } },
		})
		if (current.quantity === quantity)
			await tx.position.delete({ where: { id: current.id } })
		else
			await tx.position.update({
				where: { id: current.id },
				data: {
					quantity: { decrement: quantity },
					realizedPnl: { increment: realizedPnl },
				},
			})
		return tx.order.create({
			data: {
				userId,
				portfolioId: portfolio.id,
				symbol: normalized,
				side: 'SELL',
				quantity,
				price,
				totalCost,
			},
		})
	})
}

export async function getPositions(userId: string) {
	const portfolio = await portfolioFor(userId)
	return Promise.all(
		portfolio.positions.map(async (position) => {
			const price = await priceFor(position.symbol).catch(
				() => position.avgPrice,
			)
			return {
				...position,
				currentPrice: price,
				marketValue: price * position.quantity,
				unrealizedPnl: (price - position.avgPrice) * position.quantity,
			}
		}),
	)
}
export async function getPortfolioValue(userId: string) {
	const portfolio = await portfolioFor(userId)
	const positions = await getPositions(userId)
	const positionsValue = positions.reduce(
		(sum, position) => sum + position.marketValue,
		0,
	)
	return {
		balance: portfolio.balance,
		positionsValue,
		totalValue: portfolio.balance + positionsValue,
		pnl: portfolio.balance + positionsValue - portfolio.initialCapital,
		initialCapital: portfolio.initialCapital,
		positions,
	}
}
export async function getOrderHistory(userId: string) {
	return prisma.order.findMany({
		where: { userId },
		orderBy: { executedAt: 'desc' },
		take: 100,
	})
}
export async function getPerformance(userId: string) {
	const portfolio = await getPortfolioValue(userId)
	return {
		...portfolio,
		benchmark: {
			symbol: 'EGX30',
			available: false,
			message: 'لا توجد سلسلة EGX30 موحدة متاحة للمقارنة حالياً',
		},
	}
}
