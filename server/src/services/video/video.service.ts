import { prisma } from '../../lib/prisma.js'

export async function listVideos(
	filters: { category?: string; symbol?: string } = {},
) {
	try {
		return await prisma.video.findMany({
			where: {
				...(filters.category ? { category: filters.category } : {}),
				...(filters.symbol ? { symbol: filters.symbol } : {}),
			},
			orderBy: { publishedAt: 'desc' },
			take: 50,
			include: { author: { select: { username: true, fullName: true } } },
		})
	} catch {
		return []
	}
}
export function getVideo(id: string) {
	return prisma.video.update({
		where: { id },
		data: { views: { increment: 1 } },
		include: { author: { select: { username: true, fullName: true } } },
	})
}
export function createVideo(authorId: string, data: Record<string, unknown>) {
	return prisma.video.create({
		data: { ...(data as Record<string, any>), authorId } as any,
	})
}
export async function listWebinars() {
	try {
		return await prisma.webinar.findMany({
			where: { scheduledAt: { gte: new Date() } },
			orderBy: { scheduledAt: 'asc' },
			take: 30,
			include: { host: { select: { username: true, fullName: true } } },
		})
	} catch {
		return []
	}
}
export function registerWebinar(id: string) {
	return prisma.webinar.update({
		where: { id },
		data: { attendees: { increment: 1 } },
	})
}
