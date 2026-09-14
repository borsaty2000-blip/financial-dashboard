const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

import {
	anomalyFallback,
	ensembleFallback,
	sentimentFallback,
} from './analysis-fallback.js'

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

export async function ensemble(
	prices: number[],
	steps = 30,
): Promise<Record<string, unknown>> {
	try {
		return await request('/forecast/ensemble', 'POST', { prices, steps })
	} catch {
		return ensembleFallback(prices, steps)
	}
}

export async function sentiment(symbol: string) {
	try {
		return await request(`/sentiment/${encodeURIComponent(symbol)}`, 'GET')
	} catch {
		return sentimentFallback(symbol)
	}
}

export async function anomaly(
	symbol: string,
	prices: number[],
	volumes: number[],
) {
	try {
		return await request('/analyze/anomaly', 'POST', {
			symbol,
			prices,
			volumes,
		})
	} catch {
		return anomalyFallback(symbol, prices, volumes)
	}
}
