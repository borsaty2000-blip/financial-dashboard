import { generateSecret, generateURI, verifySync } from 'otplib'
import QRCode from 'qrcode'
import { prisma } from '../../lib/prisma.js'
export async function beginTwoFactor(userId: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { email: true },
	})
	const secret = generateSecret()
	const otpauth = generateURI({ issuer: 'Borsaty', label: user.email, secret })
	return { secret, otpauth, qrCode: await QRCode.toDataURL(otpauth) }
}
export async function confirmTwoFactor(
	userId: string,
	secret: string,
	code: string,
) {
	if (!verifySync({ token: code, secret }).valid)
		throw new Error('رمز 2FA غير صحيح')
	return prisma.user.update({
		where: { id: userId },
		data: { twoFactorSecret: secret, twoFactorEnabled: true },
		select: { twoFactorEnabled: true },
	})
}
export async function disableTwoFactor(userId: string, code: string) {
	const user = await prisma.user.findUniqueOrThrow({
		where: { id: userId },
		select: { twoFactorSecret: true, twoFactorEnabled: true },
	})
	if (
		!user.twoFactorEnabled ||
		!user.twoFactorSecret ||
		!verifySync({ token: code, secret: user.twoFactorSecret }).valid
	)
		throw new Error('رمز 2FA غير صحيح')
	return prisma.user.update({
		where: { id: userId },
		data: { twoFactorSecret: null, twoFactorEnabled: false },
		select: { twoFactorEnabled: true },
	})
}
export function verifyTwoFactor(secret: string, code: string) {
	return verifySync({ token: code, secret }).valid
}
