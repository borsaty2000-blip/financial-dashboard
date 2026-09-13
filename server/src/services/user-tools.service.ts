import { prisma } from '../lib/prisma.js'

export async function listWatchlists(userId: string) {
	return prisma.watchlist.findMany({
		where: { userId },
		include: { items: true },
		orderBy: { createdAt: 'asc' },
	})
}
export async function createWatchlist(userId: string, name = 'قائمتي') {
	return prisma.watchlist.create({
		data: {
			userId,
			name,
			isDefault: (await prisma.watchlist.count({ where: { userId } })) === 0,
		},
		include: { items: true },
	})
}
export async function deleteWatchlist(userId: string, id: string) {
	return prisma.watchlist.deleteMany({ where: { id, userId } })
}
export async function addWatchlistItem(
	userId: string,
	id: string,
	symbol: string,
	market = 'EGX',
) {
	const owned = await prisma.watchlist.findFirst({ where: { id, userId } })
	if (!owned) throw new Error('قائمة المتابعة غير موجودة')
	return prisma.watchlistItem.upsert({
		where: {
			watchlistId_symbol: { watchlistId: id, symbol: symbol.toUpperCase() },
		},
		update: { market },
		create: { watchlistId: id, symbol: symbol.toUpperCase(), market },
	})
}
export async function removeWatchlistItem(
	userId: string,
	id: string,
	symbol: string,
) {
	const owned = await prisma.watchlist.findFirst({ where: { id, userId } })
	if (!owned) throw new Error('قائمة المتابعة غير موجودة')
	return prisma.watchlistItem.deleteMany({
		where: { watchlistId: id, symbol: symbol.toUpperCase() },
	})
}
export async function listAlerts(userId: string) {
	return prisma.priceAlert.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
	})
}
export async function createAlert(
	userId: string,
	data: {
		symbol: string
		market?: string
		condition: string
		targetValue: number
	},
) {
	return prisma.priceAlert.create({
		data: {
			userId,
			symbol: data.symbol.toUpperCase(),
			market: data.market ?? 'EGX',
			condition: data.condition,
			targetValue: data.targetValue,
		},
	})
}
export async function updateAlert(
	userId: string,
	id: string,
	data: { isActive?: boolean; targetValue?: number },
) {
	return prisma.priceAlert.updateMany({ where: { id, userId }, data })
}
export async function deleteAlert(userId: string, id: string) {
	return prisma.priceAlert.deleteMany({ where: { id, userId } })
}
export async function listNotifications(userId: string) {
	return prisma.notification.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: 50,
	})
}
export async function readNotification(userId: string, id: string) {
	return prisma.notification.updateMany({
		where: { id, userId },
		data: { isRead: true },
	})
}
export async function readAllNotifications(userId: string) {
	return prisma.notification.updateMany({
		where: { userId, isRead: false },
		data: { isRead: true },
	})
}
export async function getUnreadNotificationCount(userId: string) {
	return {
		count: await prisma.notification.count({
			where: { userId, isRead: false },
		}),
	}
}
