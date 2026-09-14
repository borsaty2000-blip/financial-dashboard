import { randomInt } from 'node:crypto'
import { prisma } from '../../lib/prisma.js'
export async function configureWhatsApp(
	userId: string,
	phoneNumber: string,
	alertTypes: string[],
) {
	const verificationCode = String(randomInt(100000, 999999))
	return prisma.whatsAppSubscription.upsert({
		where: { userId },
		update: { phoneNumber, alertTypes, verificationCode, isVerified: false },
		create: {
			userId,
			phoneNumber,
			alertTypes,
			verificationCode,
			isVerified: false,
		},
	})
}
export async function verifyWhatsApp(userId: string, code: string) {
	const record = await prisma.whatsAppSubscription.findUnique({
		where: { userId },
	})
	if (!record || record.verificationCode !== code) return false
	await prisma.whatsAppSubscription.update({
		where: { userId },
		data: { isVerified: true, verificationCode: null },
	})
	return true
}
export async function sendWhatsApp(to: string, body: string) {
	const sid = process.env.TWILIO_ACCOUNT_SID
	const token = process.env.TWILIO_AUTH_TOKEN
	const from = process.env.TWILIO_WHATSAPP_FROM
	if (!sid || !token || !from)
		return {
			accepted: false,
			available: false,
			error: 'Twilio WhatsApp غير مهيأ',
		}
	const normalize = (value: string) =>
		value.startsWith('whatsapp:') ? value : `whatsapp:${value}`
	const result = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
		{
			method: 'POST',
			headers: {
				Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: new URLSearchParams({
				From: normalize(from),
				To: normalize(to),
				Body: body,
			}),
		},
	)
	const data = await result.json().catch(() => ({}))
	return result.ok
		? { accepted: true, available: true, sid: data.sid }
		: { accepted: false, available: true, error: 'تعذر إرسال WhatsApp' }
}
export async function sendWhatsAppForUser(
	userId: string,
	body: string,
	type = 'PRICE',
) {
	const subscription = await prisma.whatsAppSubscription.findUnique({
		where: { userId },
	})
	if (!subscription?.isVerified || !subscription.alertTypes.includes(type))
		return {
			accepted: false,
			available: false,
			error: 'WhatsApp غير مفعل لهذا النوع',
		}
	return sendWhatsApp(subscription.phoneNumber, body)
}
