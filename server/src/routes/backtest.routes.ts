import { Router, type Request, type Response } from 'express'
import { runBacktest } from '../services/analysis/backtesting.python.js'
import { CandlesService, type CandleMarket } from '../services/market/candles.service.js'

export const backtestRoutes = Router()

function numbers(value: unknown) {
	return typeof value === 'string' ? value.split(',').map(Number).filter((number) => Number.isFinite(number) && number > 0) : []
}
function market(value: unknown): CandleMarket {
	return value === 'TASI' || value === 'GLOBAL' || value === 'CRYPTO' || value === 'COMMODITIES' ? value : 'EGX'
}
async function handle(strategy: 'elliott' | 'gann' | 'indicators', request: Request, response: Response, options?: { commission?: number; slippage?: number }) {
	let prices = numbers(request.query.prices)
	const lookback = Math.max(5, Math.min(365, Number(request.query.lookback ?? 30)))
	const horizon = Math.max(1, Math.min(90, Number(request.query.horizon ?? 7)))
	if (!prices.length) {
		const candles = await CandlesService.getCandles(request.params.symbol, market(request.query.market), '1d', Math.max(lookback + horizon + 1, 250))
		prices = candles.candles.map((candle) => candle.close)
	}
	if (prices.length < Math.max(lookback + horizon + 1, 40)) return response.status(503).json({ status: 'insufficient_data', reason: 'Not enough historical prices for this backtest' })
	try {
		const result = await runBacktest(strategy, prices, lookback, horizon, options)
		return response.json({ status: 'success', ...result, source: 'historical-market-data', commission: options?.commission ?? 0, slippage: options?.slippage ?? 0 })
	} catch (error) {
		return response.status(502).json({ status: 'error', message: error instanceof Error ? error.message : 'Backtest service unavailable' })
	}
}

backtestRoutes.get('/:symbol/elliott', (request, response) => handle('elliott', request, response))
backtestRoutes.get('/:symbol/gann', (request, response) => handle('gann', request, response))
backtestRoutes.get('/:symbol/indicators', (request, response) => handle('indicators', request, response))
backtestRoutes.post('/:symbol', (request, response) => {
	const body = request.body as { strategy?: string; commission?: number; slippage?: number; timeframe?: string } | undefined
	const strategy = body?.strategy === 'gann' ? 'gann' : body?.strategy === 'indicators' ? 'indicators' : 'elliott'
	request.query.strategy = strategy
	return handle(strategy, request, response, { commission: Number(body?.commission ?? 0), slippage: Number(body?.slippage ?? 0) })
})
