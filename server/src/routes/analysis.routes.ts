import { Router } from 'express'
import {
	calculateIndicatorSnapshot,
	type Candle,
} from '../services/analysis/indicators.service.js'
import { analyzeElliott } from '../services/analysis/elliott.python.js'
import { analyzeGann } from '../services/analysis/gann.python.js'
import {
	analyze,
	forecastARIMA,
	forecastLSTM,
} from '../services/analysis/statistical.service.js'
import { ConsensusService } from '../services/analysis/consensus.service.js'
import { analyzeCandlesticks } from '../services/analysis/candlestick.python.js'

export const analysisRoutes = Router()

function queryPrices(value: unknown) {
	if (typeof value !== 'string') return []
	return value
		.split(',')
		.map(Number)
		.filter((price) => Number.isFinite(price) && price > 0)
}

function querySteps(value: unknown) {
	const steps = typeof value === 'string' ? Number(value) : 30
	return Number.isFinite(steps)
		? Math.max(1, Math.min(365, Math.trunc(steps)))
		: 30
}

function queryNumbers(value: unknown) {
	return typeof value === 'string'
		? value
				.split(',')
				.map(Number)
				.filter((number) => Number.isFinite(number))
		: []
}

analysisRoutes.get('/:symbol/candlestick', async (request, response) => {
	const opens = queryNumbers(request.query.opens)
	const highs = queryNumbers(request.query.highs)
	const lows = queryNumbers(request.query.lows)
	const closes = queryNumbers(request.query.closes)
	const dates =
		typeof request.query.dates === 'string'
			? request.query.dates.split(',')
			: []
	if (
		opens.length < 2 ||
		opens.length !== highs.length ||
		opens.length !== lows.length ||
		opens.length !== closes.length
	)
		return response.status(503).json({
			status: 'unavailable',
			message: 'Matching OHLC arrays are required',
		})
	try {
		return response.json(
			await analyzeCandlesticks(opens, highs, lows, closes, dates),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Candlestick service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/consensus', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	const dates =
		typeof request.query.dates === 'string'
			? request.query.dates.split(',')
			: []
	if (prices.length < 30)
		return response.status(503).json({
			status: 'unavailable',
			message: 'At least 30 prices are required',
		})
	try {
		return response.json(
			await ConsensusService.calculate(
				request.params.symbol.toUpperCase(),
				prices,
				dates,
			),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Consensus service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/statistical', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	if (prices.length < 3)
		return response
			.status(503)
			.json({ status: 'unavailable', message: 'No price series was provided' })
	try {
		return response.json(await analyze(prices))
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error
					? error.message
					: 'Statistical service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/forecast/arima', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	if (prices.length < 20)
		return response.status(503).json({
			status: 'unavailable',
			message: 'At least 20 prices are required',
		})
	try {
		return response.json(
			await forecastARIMA(prices, querySteps(request.query.steps)),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'ARIMA service unavailable',
		})
	}
})

analysisRoutes.get('/:symbol/forecast/lstm', async (request, response) => {
	const prices = queryPrices(request.query.prices)
	if (prices.length < 20)
		return response.status(503).json({
			status: 'unavailable',
			message: 'At least 20 prices are required',
		})
	try {
		return response.json(
			await forecastLSTM(prices, querySteps(request.query.steps)),
		)
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'LSTM service unavailable',
		})
	}
})

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
