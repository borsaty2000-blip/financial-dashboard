import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

const symbols = [
	['COMI', 'البنك التجاري الدولي', 'EGX'],
	['ABUK', 'أبو قير للأسمدة', 'EGX'],
	['ETEL', 'المصرية للاتصالات', 'EGX'],
	['SWDY', 'السويدي إليكتريك', 'EGX'],
	['TMGH', 'طلعت مصطفى', 'EGX'],
	['ORAS', 'أوراسكوم للإنشاء', 'EGX'],
	['MFPC', 'موبكو', 'EGX'],
	['EKHO', 'القابضة المصرية الكويتية', 'EGX'],
	['2222', 'أرامكو السعودية', 'TASI'],
	['1120', 'الراجحي', 'TASI'],
	['1010', 'الرياض', 'TASI'],
	['2010', 'سابك', 'TASI'],
] as const
function dateOffset(months: number, day: number) {
	const date = new Date()
	date.setUTCMonth(date.getUTCMonth() + months, day)
	date.setUTCHours(0, 0, 0, 0)
	return date
}
function seedIPO() {
	return symbols.map(([symbol, companyName, market], index) => ({
		id: randomUUID(),
		symbol,
		companyName,
		nameAr: `طرح ${companyName}`,
		market,
		ipoDate: dateOffset(index % 6, 5 + index),
		priceRange:
			market === 'EGX'
				? `${10 + index}-${12 + index} EGP`
				: `${30 + index}-${34 + index} SAR`,
		sharesOffered: BigInt((index + 1) * 10000000),
		totalValue: (index + 1) * 120000000,
		status: index % 3 === 0 ? 'OPEN' : 'UPCOMING',
		subscriptionStart: dateOffset(index % 6, 1 + index),
		subscriptionEnd: dateOffset(index % 6, 4 + index),
		createdAt: new Date(),
	}))
}
function seedDividends() {
	return symbols.map(([symbol, , market], index) => {
		const exDate = dateOffset(index % 6, 8 + index)
		return {
			id: randomUUID(),
			symbol,
			market,
			amount: Number((0.35 + index * 0.08).toFixed(2)),
			currency: market === 'EGX' ? 'EGP' : 'SAR',
			exDate,
			recordDate: new Date(exDate.getTime() + 86400000 * 2),
			paymentDate: new Date(exDate.getTime() + 86400000 * 14),
			yieldPercent: Number((2.2 + index * 0.4).toFixed(2)),
			status: index % 4 === 0 ? 'PAID' : 'UPCOMING',
			createdAt: new Date(),
		}
	})
}
function seedEarnings() {
	return symbols.map(([symbol, , market], index) => ({
		id: randomUUID(),
		symbol,
		market,
		quarter: `Q${(index % 4) + 1}`,
		fiscalYear: 2026,
		reportDate: dateOffset(index % 6, 12 + index),
		timeOfDay: index % 2 ? 'AFTER_CLOSE' : 'BEFORE_OPEN',
		epsEstimate: Number((1.1 + index * 0.12).toFixed(2)),
		epsActual: index % 3 === 0 ? Number((1.2 + index * 0.13).toFixed(2)) : null,
		revenueEstimate: (index + 2) * 100000000,
		revenueActual: index % 3 === 0 ? (index + 2.1) * 100000000 : null,
		surprise: index % 3 === 0 ? Number((3 + index * 0.5).toFixed(2)) : null,
		createdAt: new Date(),
	}))
}
function seedSplits() {
	return symbols.slice(0, 6).map(([symbol, , market], index) => ({
		id: randomUUID(),
		symbol,
		market,
		splitDate: dateOffset(index, 20),
		ratio: index % 2 ? '2:1' : '3:1',
		oldShares: BigInt(1000),
		newShares: BigInt(index % 2 ? 2000 : 3000),
		createdAt: new Date(),
	}))
}
const clean = (value: any) =>
	JSON.parse(
		JSON.stringify(value, (_key, item) =>
			typeof item === 'bigint' ? item.toString() : item,
		),
	)
async function seed(
	table: 'iPOEvent' | 'dividendEvent' | 'earningsEvent' | 'splitEvent',
) {
	const data =
		table === 'iPOEvent'
			? seedIPO()
			: table === 'dividendEvent'
				? seedDividends()
				: table === 'earningsEvent'
					? seedEarnings()
					: seedSplits()
	const delegate = (prisma as any)[table]
	await delegate
		.createMany({ data, skipDuplicates: true })
		.catch(() => undefined)
	return data
}
export async function getIPO(upcoming = false) {
	const fallback = seedIPO()
	await seed('iPOEvent')
	try {
		const data = await prisma.iPOEvent.findMany({
			where: upcoming ? { ipoDate: { gte: new Date() } } : undefined,
			orderBy: { ipoDate: 'asc' },
		})
		return clean(data.length ? data : fallback)
	} catch {
		return clean(
			upcoming
				? fallback.filter((item) => item.ipoDate >= new Date())
				: fallback,
		)
	}
}
export async function getDividends(symbol?: string, upcoming = false) {
	const fallback = seedDividends()
	await seed('dividendEvent')
	try {
		const data = await prisma.dividendEvent.findMany({
			where: {
				...(symbol ? { symbol: symbol.toUpperCase() } : {}),
				...(upcoming ? { exDate: { gte: new Date() } } : {}),
			},
			orderBy: { exDate: 'asc' },
		})
		return clean(
			data.length
				? data
				: fallback.filter(
						(item) => !symbol || item.symbol === symbol.toUpperCase(),
					),
		)
	} catch {
		return clean(fallback)
	}
}
export async function getEarnings(symbol?: string, upcoming = false) {
	const fallback = seedEarnings()
	await seed('earningsEvent')
	try {
		const data = await prisma.earningsEvent.findMany({
			where: {
				...(symbol ? { symbol: symbol.toUpperCase() } : {}),
				...(upcoming ? { reportDate: { gte: new Date() } } : {}),
			},
			orderBy: { reportDate: 'asc' },
		})
		return clean(data.length ? data : fallback)
	} catch {
		return clean(fallback)
	}
}
export async function getSplits(symbol?: string) {
	const fallback = seedSplits()
	await seed('splitEvent')
	try {
		const data = await prisma.splitEvent.findMany({
			where: symbol ? { symbol: symbol.toUpperCase() } : undefined,
			orderBy: { splitDate: 'asc' },
		})
		return clean(data.length ? data : fallback)
	} catch {
		return clean(fallback)
	}
}
