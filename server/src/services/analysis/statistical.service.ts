const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ??
	(process.env.NODE_ENV === 'production'
		? 'https://www.borsatyai.com/api/python'
		: 'http://127.0.0.1:8001')
).replace(/\/$/, '')

import { forecastFallback, statisticalFallback } from './analysis-fallback.js'

async function postPython(path: string, payload: unknown) {
	const resolvedPath =
		pythonServiceUrl.endsWith('/api/python') && path === '/analyze/statistical'
			? '/statistical'
			: pythonServiceUrl.endsWith('/api/python') &&
				  path.startsWith('/forecast/')
				? '/forecast'
				: path
	const resolvedPayload =
		pythonServiceUrl.endsWith('/api/python') && path.startsWith('/forecast/')
			? {
					...(payload as Record<string, unknown>),
					type: path.endsWith('/lstm') ? 'lstm' : 'arima',
				}
			: payload
	const response = await fetch(`${pythonServiceUrl}${resolvedPath}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(resolvedPayload),
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
