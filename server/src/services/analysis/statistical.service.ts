const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

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

export function analyze(prices: number[]) {
	return postPython('/analyze/statistical', { prices })
}

export function forecastARIMA(prices: number[], steps = 30) {
	return postPython('/forecast/arima', { prices, steps })
}

export function forecastLSTM(prices: number[], steps = 30) {
	return postPython('/forecast/lstm', { prices, steps })
}
