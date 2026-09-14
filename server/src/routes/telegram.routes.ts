import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
export const telegramRoutes = Router()
telegramRoutes.get('/telegram/info', (_request, response) =>
	response.json({
		botUsername: process.env.TELEGRAM_BOT_USERNAME ?? null,
		botUrl: process.env.TELEGRAM_BOT_USERNAME
			? `https://t.me/${process.env.TELEGRAM_BOT_USERNAME}`
			: null,
		configured: Boolean(process.env.TELEGRAM_BOT_TOKEN),
	}),
)
telegramRoutes.post(
	'/telegram/link',
	requireAuth,
	async (request, response) => {
		const parsed = z
			.object({
				chatId: z.string().min(1),
				username: z.string().optional(),
				alertTypes: z.array(z.string()).default(['PRICE', 'SIGNAL', 'NEWS']),
			})
			.safeParse(request.body)
		if (!parsed.success)
			return response.status(400).json({ error: 'chatId مطلوب' })
		const subscription = await prisma.telegramSubscription.upsert({
			where: { chatId: parsed.data.chatId },
			update: {
				userId: request.userId!,
				username: parsed.data.username,
				alertTypes: parsed.data.alertTypes,
				isActive: true,
			},
			create: {
				chatId: parsed.data.chatId,
				userId: request.userId!,
				username: parsed.data.username,
				alertTypes: parsed.data.alertTypes,
			},
		})
		return response.status(201).json({ subscription })
	},
)
telegramRoutes.post('/telegram/webhook', async (request, response) => {
	const message = request.body?.message
	const text = String(message?.text ?? '').trim()
	const chatId = message?.chat?.id
	const username = message?.from?.username
	if (chatId)
		await prisma.telegramSubscription
			.upsert({
				where: { chatId: String(chatId) },
				update: { username, isActive: true },
				create: {
					chatId: String(chatId),
					username,
					alertTypes: ['PRICE', 'SIGNAL', 'NEWS'],
				},
			})
			.catch(() => undefined)
	const command = text.split(/\s+/)[0]
	const symbol = text.split(/\s+/)[1]?.toUpperCase()
	const replies: Record<string, string> = {
		'/start':
			'مرحباً بك في BorsatyBot. استخدم /analyze COMI أو /top أو /alert.',
		'/top': 'ستظهر قائمة الأفضل عند توافر مصدر سوق موثوق.',
		'/alert': 'أنشئ التنبيه من داخل المنصة بعد تسجيل الدخول.',
	}
	const reply =
		command === '/analyze'
			? symbol
				? `طلب تحليل ${symbol} مسجل؛ افتح صفحة السهم لرؤية التحليل.`
				: 'استخدم /analyze SYMBOL'
			: (replies[command] ?? 'الأوامر: /analyze SYMBOL، /top، /alert')
	const token = process.env.TELEGRAM_BOT_TOKEN
	if (token && chatId)
		await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ chat_id: chatId, text: reply }),
		}).catch(() => undefined)
	return response.json({ ok: true, reply, delivered: Boolean(token && chatId) })
})
