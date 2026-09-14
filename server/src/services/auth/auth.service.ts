import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { signToken, verifyToken } from '../../config/jwt.js'
import type {
	LoginInput,
	RegisterInput,
} from '../../validators/auth.validator.js'
import { verifyTwoFactor } from './two-factor.service.js'

const publicUser = {
	id: true,
	email: true,
	username: true,
	fullName: true,
	avatarUrl: true,
	bio: true,
	country: true,
	language: true,
	isVerified: true,
	isActive: true,
	lastLoginAt: true,
	createdAt: true,
	updatedAt: true,
} as const
const genericAuthError = new Error(
	'خطأ في البريد أو اسم المستخدم أو كلمة المرور',
)

async function issueSession(
	userId: string,
	userAgent?: string,
	ipAddress?: string,
) {
	const accessToken = await signToken(userId, 'access')
	const refreshToken = await signToken(userId, 'refresh')
	await prisma.session.create({
		data: {
			userId,
			token: refreshToken,
			userAgent,
			ipAddress,
			expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
		},
	})
	return { accessToken, refreshToken }
}

export async function register(
	input: RegisterInput,
	meta?: { userAgent?: string; ipAddress?: string },
) {
	const existing = await prisma.user.findFirst({
		where: { OR: [{ email: input.email }, { username: input.username }] },
		select: { id: true },
	})
	if (existing) throw genericAuthError
	const passwordHash = await bcrypt.hash(input.password, 12)
	const result = await prisma.$transaction(async (tx) => {
		const user = await tx.user.create({
			data: {
				email: input.email,
				username: input.username,
				passwordHash,
				fullName: input.fullName,
				country: input.country,
				language: input.language,
				preference: { create: {} },
			},
			select: publicUser,
		})
		const achievement = await tx.achievement.findUnique({
			where: { code: 'FIRST_LOGIN' },
			select: { id: true },
		})
		if (achievement)
			await tx.userAchievement.create({
				data: {
					userId: user.id,
					achievementId: achievement.id,
					progress: 100,
					completed: true,
					completedAt: new Date(),
				},
			})
		return user
	})
	return {
		user: result,
		...(await issueSession(result.id, meta?.userAgent, meta?.ipAddress)),
	}
}

export async function login(
	input: LoginInput,
	meta?: { userAgent?: string; ipAddress?: string },
) {
	const user = await prisma.user.findFirst({
		where: {
			OR: [
				{ email: input.identifier.toLowerCase() },
				{ username: input.identifier },
			],
		},
	})
	if (
		!user ||
		!user.isActive ||
		!(await bcrypt.compare(input.password, user.passwordHash))
	)
		throw genericAuthError
	if (
		user.twoFactorEnabled &&
		(!input.twoFactorCode ||
			!user.twoFactorSecret ||
			!verifyTwoFactor(user.twoFactorSecret, input.twoFactorCode))
	) {
		throw new Error('رمز التحقق بخطوتين مطلوب أو غير صحيح')
	}
	await prisma.loginHistory
		.create({
			data: {
				userId: user.id,
				userAgent: meta?.userAgent,
				ipAddress: meta?.ipAddress,
				success: true,
			},
		})
		.catch(() => undefined)
	await prisma.user.update({
		where: { id: user.id },
		data: { lastLoginAt: new Date() },
	})
	return {
		user: await prisma.user.findUniqueOrThrow({
			where: { id: user.id },
			select: publicUser,
		}),
		...(await issueSession(user.id, meta?.userAgent, meta?.ipAddress)),
	}
}

export async function logout(token: string) {
	const result = await prisma.session.updateMany({
		where: { token, revokedAt: null },
		data: { revokedAt: new Date() },
	})
	return { success: result.count > 0 }
}
export async function refreshToken(
	token: string,
	meta?: { userAgent?: string; ipAddress?: string },
) {
	const payload = await verifyToken(token, 'refresh')
	const session = await prisma.session.findFirst({
		where: {
			token,
			userId: payload.sub,
			revokedAt: null,
			expiresAt: { gt: new Date() },
		},
	})
	if (!session) throw genericAuthError
	await prisma.session.update({
		where: { id: session.id },
		data: { revokedAt: new Date() },
	})
	return issueSession(session.userId, meta?.userAgent, meta?.ipAddress)
}
export async function getCurrentUser(userId: string) {
	return prisma.user.findUnique({
		where: { id: userId },
		select: {
			...publicUser,
			preference: true,
			achievements: { include: { achievement: true } },
		},
	})
}
