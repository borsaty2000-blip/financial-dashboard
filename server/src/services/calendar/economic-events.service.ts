import { randomUUID } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

type Event = {
	eventKey: string
	date: Date
	country: string
	category: string
	title: string
	importance: string
	previous?: string
	forecast?: string
	actual?: string
	source: string
}
const templates = [
	['EG', 'Monetary', 'قرار الفائدة المصرية', 'HIGH'],
	['SA', 'Inflation', 'التضخم السعودي', 'MEDIUM'],
	['US', 'Employment', 'تقرير الوظائف الأمريكي', 'HIGH'],
	['EG', 'Inflation', 'التضخم المصري', 'HIGH'],
	['SA', 'Monetary', 'قرار الفائدة السعودية', 'HIGH'],
	['GLOBAL', 'Growth', 'مؤشر مديري المشتريات العالمي', 'MEDIUM'],
] as const
function manualEvents(): Event[] {
	const events: Event[] = []
	const start = new Date()
	start.setUTCDate(1)
	start.setUTCHours(0, 0, 0, 0)
	for (let month = 0; month < 6; month++)
		for (let index = 0; index < templates.length; index++) {
			const [country, category, title, importance] = templates[index]
			const date = new Date(start)
			date.setUTCMonth(start.getUTCMonth() + month, Math.min(25, 3 + index * 4))
			events.push({
				eventKey: `manual-${date.toISOString().slice(0, 10)}-${country}-${category}`,
				date,
				country,
				category,
				title,
				importance,
				source: 'manual',
			})
		}
	return events
}

export async function seedEconomicEvents() {
	const events = manualEvents()
	await prisma.economicEvent
		.createMany({
			data: events.map((event) => ({ ...event, id: randomUUID() })),
			skipDuplicates: true,
		})
		.catch(() => undefined)
	return events.length
}
export async function listEconomicEvents(filters: {
	country?: string
	importance?: string
	category?: string
	from?: string
	to?: string
}) {
	await seedEconomicEvents()
	const where: any = {}
	if (filters.country && filters.country !== 'ALL')
		where.country = filters.country
	if (filters.importance && filters.importance !== 'ALL')
		where.importance = filters.importance
	if (filters.category && filters.category !== 'ALL')
		where.category = filters.category
	if (filters.from || filters.to) where.date = {}
	if (filters.from) where.date.gte = new Date(filters.from)
	if (filters.to) where.date.lte = new Date(filters.to)
	try {
		return await prisma.economicEvent.findMany({
			where,
			orderBy: { date: 'asc' },
			take: 200,
		})
	} catch {
		return manualEvents()
			.filter(
				(event) =>
					(!filters.country ||
						filters.country === 'ALL' ||
						event.country === filters.country) &&
					(!filters.importance ||
						filters.importance === 'ALL' ||
						event.importance === filters.importance) &&
					(!filters.category ||
						filters.category === 'ALL' ||
						event.category === filters.category),
			)
			.slice(0, 200)
	}
}
export async function notifyImportantEvents(userId: string) {
	const events = await listEconomicEvents({
		importance: 'HIGH',
		from: new Date().toISOString(),
	})
	await prisma.notification
		.createMany({
			data: events.slice(0, 10).map((event) => ({
				userId,
				type: 'ECONOMIC_EVENT',
				title: event.title,
				body: `حدث اقتصادي مهم بتاريخ ${event.date.toISOString().slice(0, 10)}`,
				link: '/calendar',
			})),
		})
		.catch(() => undefined)
	return { created: Math.min(events.length, 10) }
}
