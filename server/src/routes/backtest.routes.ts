import { Router, type Request, type Response } from 'express'
import { runBacktest } from '../services/analysis/backtesting.python.js'
import {
	CandlesService,
	type CandleMarket,
} from '../services/market/candles.service.js'

export const backtestRoutes = Router()

function numbers(value: unknown) {
	return typeof value === 'string'
		? value
				.split(',')
				.map(Number)
				.filter((number) => Number.isFinite(number) && number > 0)
		: []
}

function market(value: unknown): CandleMarket {
	return value === 'TASI' || value === 'GLOBAL' ? value : 'EGX'
}

async function handle(
	strategy: 'elliott' | 'gann' | 'indicators',
	request: Request,
	response: Response,
) {
	let prices = numbers(request.query.prices)
	const lookback = Math.max(
		5,
		Math.min(365, Number(request.query.lookback ?? 30)),
	)
	const horizon = Math.max(1, Math.min(90, Number(request.query.horizon ?? 7)))
	if (!prices.length) {
		const candles = await CandlesService.getCandles(
			request.params.symbol,
			market(request.query.market),
			'1d',
			Math.max(lookback + horizon + 1, 250),
		)
		prices = candles.candles.map((candle) => candle.close)
	}
	if (prices.length < Math.max(lookback + horizon + 1, 40))
		return response.status(503).json({
			status: 'unavailable',
			message: 'Not enough historical prices for this backtest',
		})
	try {
		return response.json(await runBacktest(strategy, prices, lookback, horizon))
	} catch (error) {
		return response.status(502).json({
			status: 'error',
			message:
				error instanceof Error ? error.message : 'Backtest service unavailable',
		})
	}
}

backtestRoutes.get('/:symbol/elliott', (request, response) =>
	handle('elliott', request, response),
)
backtestRoutes.get('/:symbol/gann', (request, response) =>
	handle('gann', request, response),
)
backtestRoutes.get('/:symbol/indicators', (request, response) =>
	handle('indicators', request, response),
)
