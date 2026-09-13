const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

export async function runBacktest(
	strategy: 'elliott' | 'gann' | 'indicators',
	prices: number[],
	lookback: number,
	horizon: number,
) {
	const response = await fetch(`${pythonServiceUrl}/backtest/${strategy}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			prices,
			lookback,
			horizon,
			strategy: strategy === 'indicators' ? 'rsi_macd' : strategy,
		}),
	})
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Python backtest service ${response.status}: ${JSON.stringify(body)}`,
		)
	return body
}
