import { Router } from 'express'
import {
	calculateIndicatorSnapshot,
	type Candle,
} from '../services/analysis/indicators.service.js'

export const analysisRoutes = Router()

analysisRoutes.get('/:symbol/indicators', (request, response) => {
	const rawPrices =
		typeof request.query.prices === 'string' ? request.query.prices : ''
	const prices = rawPrices
		.split(',')
		.map(Number)
		.filter((value) => Number.isFinite(value) && value > 0)
	const candles: Candle[] = prices.map((close) => ({ close }))
	response.json({
		available: candles.length > 0,
		source: 'trading-signals + finmagic',
		timestamp: new Date().toISOString(),
		freshness: 'cached',
		delay_minutes: 15,
		data: calculateIndicatorSnapshot(
			request.params.symbol.toUpperCase(),
			candles,
		),
	})
})
