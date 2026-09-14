import { analyzeGannFallback } from './analysis-fallback.js'

const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

export async function analyzeGann(prices: number[], dates: string[]) {
	try {
		const response = await fetch(`${pythonServiceUrl}/analyze/gann`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prices, dates }),
			signal: AbortSignal.timeout(5000),
		})
		const body = await response.json().catch(() => ({}))
		if (!response.ok)
			throw new Error(
				`Python Gann service ${response.status}: ${JSON.stringify(body)}`,
			)
		return body
	} catch {
		return { status: 'fallback', data: analyzeGannFallback(prices, dates) }
	}
}
