import { Router } from 'express'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'
import { handleVoiceCommand } from '../services/voice/assistant.service.js'
import {
	addWatchlistItem,
	createAlert,
	createWatchlist,
	listWatchlists,
} from '../services/user-tools.service.js'

export const voiceRoutes = Router()
const upload = multer({
	storage: multer.memoryStorage(),
	limits: { fileSize: 16 * 1024 * 1024 },
})
voiceRoutes.post(
	'/voice/query',
	upload.single('audio'),
	async (request, response) => {
		try {
			const transcript =
				typeof request.body?.text === 'string' ? request.body.text : ''
			let resolvedTranscript = transcript
			if (!resolvedTranscript && request.file && process.env.WHISPER_API_URL) {
				const form = new FormData()
				const audioBuffer = request.file.buffer.buffer.slice(
					request.file.buffer.byteOffset,
					request.file.buffer.byteOffset + request.file.buffer.byteLength,
				) as ArrayBuffer
				form.append(
					'file',
					new Blob([audioBuffer], { type: request.file.mimetype }),
					request.file.originalname,
				)
				form.append('language', 'ar')
				const whisper = await fetch(process.env.WHISPER_API_URL, {
					method: 'POST',
					body: form,
					signal: AbortSignal.timeout(30000),
				}).catch(() => null)
				if (whisper?.ok) {
					const payload = (await whisper.json()) as { text?: string }
					resolvedTranscript = payload.text ?? ''
				}
			}
			if (!resolvedTranscript && request.file)
				return response.json({
					transcriptionAvailable: false,
					text: '',
					response:
						'تم استلام الملف الصوتي. أضف WHISPER_API_URL لتفعيل التفريغ الصوتي server-side.',
					audioUrl: null,
				})
			if (!resolvedTranscript)
				return response
					.status(400)
					.json({ error: 'أرسل نص الأمر أو ملفاً صوتياً' })
			const result = await handleVoiceCommand(resolvedTranscript)
			let audioBase64: string | null = null
			const pythonUrl = (process.env.PYTHON_SERVICE_URL ?? '').replace(
				/\/$/,
				'',
			)
			if (pythonUrl) {
				const tts = await fetch(`${pythonUrl}/tts/analysis`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						symbol: result.symbol ?? 'MARKET',
						analysis: { text: result.text, signal: result.intent },
					}),
					signal: AbortSignal.timeout(15000),
				}).catch(() => null)
				if (tts?.ok)
					audioBase64 = Buffer.from(await tts.arrayBuffer()).toString('base64')
			}
			return response.json({
				transcriptionAvailable: true,
				transcript: resolvedTranscript,
				...result,
				audioBase64,
				audioUrl: audioBase64 ? `data:audio/mpeg;base64,${audioBase64}` : null,
			})
		} catch {
			return response.status(502).json({ error: 'تعذر معالجة الأمر الصوتي' })
		}
	},
)
voiceRoutes.post(
	'/voice/query/authenticated',
	requireAuth,
	upload.none(),
	async (request, response) => {
		const text = typeof request.body?.text === 'string' ? request.body.text : ''
		if (!text) return response.status(400).json({ error: 'النص مطلوب' })
		const result = await handleVoiceCommand(text, request.userId)
		if (result.intent === 'ADD_WATCHLIST' && result.symbol) {
			const lists = await listWatchlists(request.userId!)
			const list = lists[0] ?? (await createWatchlist(request.userId!))
			await addWatchlistItem(request.userId!, list.id, result.symbol)
			result.text = `تمت إضافة ${result.symbol} إلى قائمة المتابعة.`
		}
		if (
			result.intent === 'CREATE_ALERT' &&
			result.symbol &&
			typeof result.action?.target === 'number'
		) {
			await createAlert(request.userId!, {
				symbol: result.symbol,
				condition: 'PRICE_ABOVE',
				targetValue: result.action.target,
			})
			result.text = `تم إنشاء تنبيه تعليمي لـ${result.symbol} عند ${result.action.target}.`
		}
		return response.json({
			transcriptionAvailable: true,
			transcript: text,
			...result,
		})
	},
)
