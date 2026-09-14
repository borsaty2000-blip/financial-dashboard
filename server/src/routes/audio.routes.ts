import { Router } from 'express'
import { CandlesService } from '../services/market/candles.service.js'

export const audioRoutes = Router()
audioRoutes.get('/:symbol/audio', async (request, response) => {
	const symbol = request.params.symbol.toUpperCase()
	try {
		const candles = await CandlesService.getCandles(symbol, 'EGX', '1d', 30)
		const last = candles.candles.at(-1)?.close
		return response.json({
			available: false,
			symbol,
			text: last
				? `السعر الأخير لسهم ${symbol} هو ${last.toFixed(2)}`
				: `لا تتوفر بيانات للسهم ${symbol}`,
			audioUrl: null,
			message: 'يمكن للواجهة استخدام قارئ الشاشة المحلي.',
		})
	} catch (error) {
		return response.status(502).json({
			available: false,
			error:
				error instanceof Error ? error.message : 'Audio analysis unavailable',
		})
	}
})
