import webpush from 'web-push'
import { prisma } from '../../lib/prisma.js'
const configured = Boolean(
	process.env.VAPID_PUBLIC_KEY &&
	process.env.VAPID_PRIVATE_KEY &&
	process.env.VAPID_SUBJECT,
)
if (configured)
	webpush.setVapidDetails(
		process.env.VAPID_SUBJECT!,
		process.env.VAPID_PUBLIC_KEY!,
		process.env.VAPID_PRIVATE_KEY!,
	)
type Payload = {
	title: string
	body: string
	icon?: string
	link?: string
	data?: Record<string, unknown>
}
export async function subscribeToPush(
	userId: string,
	subscription: {
		endpoint: string
		keys: { p256dh: string; auth: string }
		deviceType?: string
	},
) {
	return prisma.pushSubscription.upsert({
		where: { userId_endpoint: { userId, endpoint: subscription.endpoint } },
		update: {
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			deviceType: subscription.deviceType,
			isActive: true,
		},
		create: {
			userId,
			endpoint: subscription.endpoint,
			p256dh: subscription.keys.p256dh,
			auth: subscription.keys.auth,
			deviceType: subscription.deviceType,
		},
	})
}
export async function unsubscribeFromPush(userId: string, endpoint?: string) {
	return prisma.pushSubscription.updateMany({
		where: { userId, ...(endpoint ? { endpoint } : {}) },
		data: { isActive: false },
	})
}
export async function sendPush(userId: string, payload: Payload) {
	const notification = await prisma.pushNotification.create({
		data: {
			userId,
			title: payload.title,
			body: payload.body,
			icon: payload.icon,
			link: payload.link,
			...(payload.data ? { data: payload.data as any } : {}),
		},
	})
	if (!configured)
		return {
			notification,
			delivered: false,
			available: false,
			reason: 'VAPID غير مهيأ',
		}
	const subscriptions = await prisma.pushSubscription.findMany({
		where: { userId, isActive: true },
	})
	let delivered = 0
	for (const subscription of subscriptions) {
		try {
			await webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: { p256dh: subscription.p256dh, auth: subscription.auth },
				},
				JSON.stringify(payload),
			)
			delivered += 1
		} catch (error: any) {
			if (error?.statusCode === 404 || error?.statusCode === 410)
				await prisma.pushSubscription.update({
					where: { id: subscription.id },
					data: { isActive: false },
				})
		}
	}
	await prisma.pushNotification.update({
		where: { id: notification.id },
		data: { sent: delivered > 0, sentAt: delivered > 0 ? new Date() : null },
	})
	return {
		notification,
		delivered: delivered > 0,
		devices: delivered,
		available: true,
	}
}
export async function sendBulkPush(userIds: string[], payload: Payload) {
	return Promise.all(userIds.map((userId) => sendPush(userId, payload)))
}
export async function listPushNotifications(userId: string) {
	return prisma.pushNotification.findMany({
		where: { userId },
		orderBy: { createdAt: 'desc' },
		take: 50,
	})
}
