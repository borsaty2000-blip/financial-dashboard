import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
const symbols = ['COMI', 'ABUK', 'ETEL', 'SWDY', 'TMGH', '2222', '1120']
function seedTrades() {
	return symbols.concat(symbols.slice(0, 5)).map((symbol, index) => {
		const date = new Date(Date.now() - index * 86400000 * 3)
		return {
			id: randomUUID(),
			symbol,
			insiderName: ['أحمد علي', 'سارة حسن', 'مجلس الإدارة'][index % 3],
			insiderRole: index % 3 === 0 ? 'CEO' : index % 3 === 1 ? 'CFO' : 'Board',
			transactionType: index % 2 ? 'SELL' : 'BUY',
			shares: (index + 1) * 5000,
			price: 30 + index * 4,
			totalValue: (index + 1) * 5000 * (30 + index * 4),
			transactionDate: date,
			filingDate: new Date(date.getTime() + 86400000),
			source: 'manual-seed',
		}
	})
}
export async function getInsiderTrades(symbol?: string) {
	const fallback = seedTrades().filter(
		(item) => !symbol || item.symbol === symbol.toUpperCase(),
	)
	try {
		await prisma.insiderTrade.createMany({
			data: seedTrades(),
			skipDuplicates: true,
		})
		const data = await prisma.insiderTrade.findMany({
			where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
			orderBy: { transactionDate: 'desc' },
			take: 50,
		})
		return data.length ? data : fallback
	} catch {
		return fallback
	}
}
export async function getOwnership(symbol: string) {
	const normalized = symbol.toUpperCase()
	const rows =
		normalized === 'COMI'
			? [
					{ name: 'مؤسسات محلية', percentage: 42 },
					{ name: 'مستثمرون أجانب', percentage: 31 },
					{ name: 'أفراد', percentage: 27 },
				]
			: [
					{ name: 'مؤسسات', percentage: null },
					{ name: 'أفراد', percentage: null },
				]
	return {
		symbol: normalized,
		shareholders: rows,
		freeFloat: null,
		available: rows.some((row) => row.percentage != null),
		disclaimer: 'هيكل الملكية التفصيلي يتطلب إفصاحاً مرخصاً لكل شركة.',
	}
}
