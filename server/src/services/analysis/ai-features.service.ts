const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

async function request<T>(
	path: string,
	method: 'GET' | 'POST',
	payload?: unknown,
): Promise<T> {
	const response = await fetch(`${pythonServiceUrl}${path}`, {
		method,
		headers: payload ? { 'Content-Type': 'application/json' } : undefined,
		body: payload ? JSON.stringify(payload) : undefined,
	})
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Python service ${response.status}: ${JSON.stringify(body)}`,
		)
	return body as T
}

export function ensemble(
	prices: number[],
	steps = 30,
): Promise<Record<string, any>> {
	return request('/forecast/ensemble', 'POST', { prices, steps })
}

export function sentiment(symbol: string) {
	return request(`/sentiment/${encodeURIComponent(symbol)}`, 'GET')
}

export function anomaly(symbol: string, prices: number[], volumes: number[]) {
	return request('/analyze/anomaly', 'POST', { symbol, prices, volumes })
}
