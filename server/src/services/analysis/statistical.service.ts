const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

import { forecastFallback, statisticalFallback } from './analysis-fallback.js'

async function postPython(path: string, payload: unknown) {
	const response = await fetch(`${pythonServiceUrl}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	})
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Python service ${response.status}: ${JSON.stringify(body)}`,
		)
	return body
}

export async function analyze(prices: number[]) {
	try {
		return await postPython('/analyze/statistical', { prices })
	} catch {
		return statisticalFallback(prices)
	}
}

export async function forecastARIMA(prices: number[], steps = 30) {
	try {
		return await postPython('/forecast/arima', { prices, steps })
	} catch {
		return forecastFallback(prices, steps, 'ARIMA')
	}
}

export async function forecastLSTM(prices: number[], steps = 30) {
	try {
		return await postPython('/forecast/lstm', { prices, steps })
	} catch {
		return forecastFallback(prices, steps, 'LSTM')
	}
}
