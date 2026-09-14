import { randomBytes } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'

export async function getOrCreateCode(userId: string) {
	return prisma.referralCode.upsert({
		where: { userId },
		update: {},
		create: {
			userId,
			code: `BORSATY-${randomBytes(4).toString('hex').toUpperCase()}`,
		},
	})
}
export async function applyCode(referredId: string, code: string) {
	const referralCode = await prisma.referralCode.findUnique({ where: { code } })
	if (
		!referralCode ||
		!referralCode.isActive ||
		referralCode.userId === referredId
	)
		throw new Error('INVALID_CODE')
	if (referralCode.maxUses != null && referralCode.uses >= referralCode.maxUses)
		throw new Error('CODE_LIMIT')
	const existing = await prisma.referral.findFirst({
		where: { referrerId: referralCode.userId, referredId },
	})
	if (existing) return existing
	return prisma.$transaction(async (tx) => {
		const referral = await tx.referral.create({
			data: {
				referrerId: referralCode.userId,
				referredId,
				code,
				status: 'REWARDED',
				rewardAmount: 50,
				rewardType: 'CREDITS',
				completedAt: new Date(),
			},
		})
		await tx.referralCode.update({
			where: { id: referralCode.id },
			data: { uses: { increment: 1 }, totalReward: { increment: 50 } },
		})
		return referral
	})
}
export async function stats(userId: string) {
	const code = await getOrCreateCode(userId)
	const referrals = await prisma.referral.findMany({
		where: { referrerId: userId },
		orderBy: { createdAt: 'desc' },
		include: { referred: { select: { username: true, fullName: true } } },
	})
	return {
		code,
		referrals,
		total: referrals.length,
		reward: referrals.reduce((sum, item) => sum + (item.rewardAmount ?? 0), 0),
		premiumMilestone:
			referrals.length >= 50 ? 'YEAR' : referrals.length >= 10 ? 'MONTH' : null,
	}
}
