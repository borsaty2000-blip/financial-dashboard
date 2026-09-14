import { prisma } from '../../lib/prisma.js'
export async function listApprovedAnalysts() {
	return prisma.analystProfile.findMany({
		where: { status: 'APPROVED' },
		include: {
			user: { select: { username: true, fullName: true, avatarUrl: true } },
		},
	})
}
export async function getAnalyst(username: string) {
	return prisma.analystProfile.findFirst({
		where: { status: 'APPROVED', user: { username } },
		include: {
			user: { select: { username: true, fullName: true, avatarUrl: true } },
			posts: { orderBy: { createdAt: 'desc' }, take: 10 },
		},
	})
}
