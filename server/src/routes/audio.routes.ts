import { Router } from 'express'
import { CandlesService } from '../services/market/candles.service.js'
export const audioRoutes = Router()
audioRoutes.get('/:symbol/audio', async (request, response) => {
	const symbol = request.params.symbol.toUpperCase()
	try {
		const candles = await CandlesService.getCandles(symbol, 'EGX', '1d', 30)
		const last = candles.candles.at(-1)?.close ?? null
		const previous = candles.candles.at(-2)?.close ?? null
		const change =
			last != null && previous ? ((last - previous) / previous) * 100 : null
		const base = (process.env.PYTHON_SERVICE_URL ?? '').replace(/\/$/, '')
		if (base) {
			const tts = await fetch(`${base}/tts/analysis`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					symbol,
					analysis: {
						price: last,
						change: change?.toFixed(2),
						signal: 'انتظار',
						confidence: '—',
						target: '—',
					},
				}),
				signal: AbortSignal.timeout(20000),
			})
			if (tts.ok) {
				response.setHeader('Content-Type', 'audio/mpeg')
				return response.send(Buffer.from(await tts.arrayBuffer()))
			}
		}
		return response.json({
			available: false,
			symbol,
			text: last
				? `السعر الأخير لسهم ${symbol} هو ${last.toFixed(2)}`
				: `لا تتوفر بيانات للسهم ${symbol}`,
			audioUrl: null,
			message: 'خدمة الصوت غير مهيأة؛ استخدم قارئ الشاشة المحلي.',
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Audio analysis unavailable',
		})
	}
})
