import { Router } from 'express'
import {
	calculateIndicatorSnapshot,
	type Candle,
} from '../services/analysis/indicators.service.js'
import { analyzeElliott } from '../services/analysis/elliott.python.js'
import { analyzeGann } from '../services/analysis/gann.python.js'

export const analysisRoutes = Router()

function queryPrices(value: unknown) {
	if (typeof value !== 'string') return []
	return value
		.split(',')
		.map(Number)
		.filter((price) => Number.isFinite(price) && price > 0)
}

analysisRoutes.get('/:symbol/elliott', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	if (prices.length < 3)
		return response
			.status(503)
			.json({ status: 'unavailable', message: 'No candle series was provided' })
	try {
		return response.json(
			await analyzeElliott(prices, Number(request.query.order ?? 5)),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Elliott service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/gann', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	const dates =
		typeof request.query.dates === 'string'
			? request.query.dates.split(',')
			: []
	if (prices.length < 3 || dates.length !== prices.length)
		return response.status(503).json({
			status: 'unavailable',
			message: 'Matching prices and dates are required',
		})
	try {
		return response.json(await analyzeGann(prices, dates))
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Gann service unavailable',
		})
	}
})

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
