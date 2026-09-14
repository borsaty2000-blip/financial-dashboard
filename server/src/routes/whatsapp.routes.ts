import { Router } from 'express'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'

export const whatsappRoutes = Router()
whatsappRoutes.post('/whatsapp', requireAuth, async (request, response) => {
	const parsed = z
		.object({
			to: z.string().min(8).max(30),
			message: z.string().min(1).max(1000),
		})
		.safeParse(request.body)
	if (!parsed.success)
		return response.status(400).json({ error: 'رقم الهاتف والرسالة مطلوبان' })
	const sid = process.env.TWILIO_ACCOUNT_SID
	const token = process.env.TWILIO_AUTH_TOKEN
	const from = process.env.TWILIO_WHATSAPP_FROM
	if (!sid || !token || !from)
		return response
			.status(503)
			.json({ available: false, error: 'Twilio WhatsApp غير مهيأ' })
	const auth = Buffer.from(`${sid}:${token}`).toString('base64')
	const body = new URLSearchParams({
		From: from,
		To: parsed.data.to,
		Body: parsed.data.message,
	})
	const result = await fetch(
		`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
		{
			method: 'POST',
			headers: {
				Authorization: `Basic ${auth}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body,
		},
	)
	const data = await result.json().catch(() => ({}))
	if (!result.ok)
		return response
			.status(502)
			.json({ available: false, error: 'تعذر إرسال WhatsApp', detail: data })
	return response.status(202).json({ accepted: true, sid: data.sid })
})
