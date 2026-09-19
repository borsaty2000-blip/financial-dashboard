import { analyzeGannFallback } from './analysis-fallback.js'

const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ??
	(process.env.NODE_ENV === 'production'
		? 'https://www.borsatyai.com/api/python'
		: 'http://127.0.0.1:8001')
).replace(/\/$/, '')

export async function analyzeGann(prices: number[], dates: string[]) {
	try {
		const isVercelPython = pythonServiceUrl.endsWith('/api/python')
		const response = await fetch(
			`${pythonServiceUrl}${isVercelPython ? '/gann' : '/analyze/gann'}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(
					isVercelPython
						? {
								candles: prices.map((close, index) => ({
									open: close,
									high: close,
									low: close,
									close,
									date: dates[index],
									volume: 0,
								})),
							}
						: { prices, dates },
				),
				signal: AbortSignal.timeout(5000),
			},
		)
		const body = await response.json().catch(() => ({}))
		if (!response.ok)
			throw new Error(
				`Python Gann service ${response.status}: ${JSON.stringify(body)}`,
			)
			return {
				...body,
				source: body?.source ?? 'python_vercel',
				engine_mode: 'python_live',
			}
		} catch {
			return { data: analyzeGannFallback(prices, dates) }
		}
}
