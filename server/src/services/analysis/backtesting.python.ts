const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

import { backtestFallback } from './analysis-fallback.js'

export async function runBacktest(
	strategy: 'elliott' | 'gann' | 'indicators',
	prices: number[],
	lookback: number,
	horizon: number,
	options: { commission?: number; slippage?: number } = {},
) {
	try {
		const response = await fetch(`${pythonServiceUrl}/backtest/${strategy}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				prices,
				lookback,
					horizon,
					commission: options.commission ?? 0,
					slippage: options.slippage ?? 0,
				strategy: strategy === 'indicators' ? 'rsi_macd' : strategy,
			}),
			signal: AbortSignal.timeout(5000),
		})
		const body = await response.json().catch(() => ({}))
		if (!response.ok)
			throw new Error(
				`Python backtest service ${response.status}: ${JSON.stringify(body)}`,
			)
		return body?.data ?? body
	} catch {
		return backtestFallback(strategy, prices, lookback, horizon)
	}
}
