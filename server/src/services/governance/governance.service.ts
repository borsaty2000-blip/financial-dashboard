import { prisma } from '../../lib/prisma.js'
export async function getInsiderTrades(symbol?: string) {
	try {
		const data = await prisma.insiderTrade.findMany({
			where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
			orderBy: { transactionDate: 'desc' },
			take: 50,
		})
		return data
	} catch {
		return []
	}
}
export async function getOwnership(symbol: string) {
	const normalized = symbol.toUpperCase()
	const rows: Array<{ name: string; percentage: number | null }> = []
	return {
		symbol: normalized,
		shareholders: rows,
		freeFloat: null,
		available: false,
		disclaimer: 'هيكل الملكية التفصيلي يتطلب إفصاحاً مرخصاً لكل شركة.',
	}
}
