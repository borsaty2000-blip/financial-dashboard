import { prisma } from '../../lib/prisma.js'
export async function listMyAnalystSubscriptions(subscriberId: string) {
	return prisma.analystSubscription.findMany({
		where: { subscriberId, status: 'ACTIVE' },
		include: {
			analyst: { select: { username: true, fullName: true, avatarUrl: true } },
		},
	})
}
export async function cancelAnalystSubscription(
	subscriberId: string,
	username: string,
) {
	return prisma.analystSubscription.updateMany({
		where: { subscriberId, analyst: { username } },
		data: { status: 'CANCELLED', endsAt: new Date() },
	})
}
