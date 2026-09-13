import { randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { sendPasswordResetEmail } from '../email/email.service.js'

const genericMessage = 'إذا كان البريد مسجلاً، ستصلك تعليمات الاستعادة قريباً.'
const resetBaseUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173'

export async function requestReset(email: string) {
	const normalized = email.trim().toLowerCase()
	const user = await prisma.user.findUnique({ where: { email: normalized } })
	if (!user || !user.isActive) return { success: true, message: genericMessage }
	await prisma.passwordReset.deleteMany({
		where: { userId: user.id, usedAt: null },
	})
	const token = randomBytes(32).toString('hex')
	await prisma.passwordReset.create({
		data: {
			userId: user.id,
			token,
			expiresAt: new Date(Date.now() + 15 * 60 * 1000),
		},
	})
	await sendPasswordResetEmail(
		user.email,
		`${resetBaseUrl}/reset-password/${token}`,
	)
	return { success: true, message: genericMessage }
}

export async function validateResetToken(token: string) {
	const reset = await prisma.passwordReset.findUnique({ where: { token } })
	const valid = Boolean(reset && !reset.usedAt && reset.expiresAt > new Date())
	return { valid }
}

export async function resetPassword(token: string, newPassword: string) {
	const reset = await prisma.passwordReset.findUnique({ where: { token } })
	if (!reset || reset.usedAt || reset.expiresAt <= new Date())
		throw new Error('رابط الاستعادة غير صالح أو منتهي')
	const passwordHash = await bcrypt.hash(newPassword, 12)
	await prisma.$transaction([
		prisma.user.update({ where: { id: reset.userId }, data: { passwordHash } }),
		prisma.session.updateMany({
			where: { userId: reset.userId, revokedAt: null },
			data: { revokedAt: new Date() },
		}),
		prisma.passwordReset.update({
			where: { id: reset.id },
			data: { usedAt: new Date() },
		}),
	])
	return { success: true }
}
