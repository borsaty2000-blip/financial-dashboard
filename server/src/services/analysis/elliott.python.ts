import { analyzeElliottFallback } from './analysis-fallback.js'

const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ??
	(process.env.NODE_ENV === 'production'
		? 'https://www.borsatyai.com/api/python'
		: 'http://127.0.0.1:8001')
).replace(/\/$/, '')

export async function analyzeElliott(prices: number[], order = 5) {
	try {
			const isVercelPython = pythonServiceUrl.endsWith('/api/python')
			const response = await fetch(`${pythonServiceUrl}${isVercelPython ? '/elliott' : '/analyze/elliott'}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prices, order }),
			signal: AbortSignal.timeout(15000),
		})
		const body = await response.json().catch(() => ({}))
		if (!response.ok)
			throw new Error(
				`Python Elliott service ${response.status}: ${JSON.stringify(body)}`,
			)
			return body
		} catch (error) {
			console.error('[analysis] Elliott provider unavailable', {
				error: error instanceof Error ? error.message : String(error),
				prices_count: prices.length,
			})
			return { data: analyzeElliottFallback(prices, order) }
		}
}
