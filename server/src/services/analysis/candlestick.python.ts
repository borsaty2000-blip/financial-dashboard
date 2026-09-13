const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

export async function analyzeCandlesticks(
	opens: number[],
	highs: number[],
	lows: number[],
	closes: number[],
	dates: string[] = [],
) {
	const response = await fetch(`${pythonServiceUrl}/analyze/candlestick`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			opens,
			highs,
			lows,
			closes,
			dates: dates.length ? dates : undefined,
		}),
	})
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Python candlestick service ${response.status}: ${JSON.stringify(body)}`,
		)
	return body
}
