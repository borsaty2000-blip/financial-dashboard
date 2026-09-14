import { Router } from 'express'

export const telegramRoutes = Router()
telegramRoutes.post('/telegram/webhook', async (request, response) => {
	const message = request.body?.message
	const text = String(message?.text ?? '').trim()
	const chatId = message?.chat?.id
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
