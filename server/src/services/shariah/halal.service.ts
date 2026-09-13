const baseUrl = (
	process.env.HALAL_TERMINAL_BASE_URL ?? 'https://api.halalterminal.com'
).replace(/\/$/, '')

export const methodologies = ['AAOIFI', 'DJIM', 'FTSE', 'MSCI', 'S&P'] as const

async function request<T>(path: string, options: RequestInit = {}) {
	const headers = new Headers(options.headers)
	const apiKey = process.env.HALAL_TERMINAL_API_KEY
	if (apiKey) headers.set('X-API-Key', apiKey)
	const response = await fetch(`${baseUrl}${path}`, { ...options, headers })
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(
			`Halal Terminal ${response.status}: ${JSON.stringify(body)}`,
		)
	return body as T
}

export async function screenStock(symbol: string, methodology?: string) {
	const query = methodology
		? `?methodology=${encodeURIComponent(methodology)}`
		: ''
	return request(
		`/api/screen/${encodeURIComponent(symbol.toUpperCase())}${query}`,
	)
}

export async function getMethodologies() {
	return {
		methodologies,
		source: 'Halal Terminal README',
		disclaimer: 'نتيجة فحص منهجية تعليمية وليست فتوى شرعية.',
	}
}

export async function batchScreen(symbols: string[]) {
	return request('/api/portfolio/scan', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			symbols: symbols.map((symbol) => symbol.toUpperCase()),
		}),
	})
}
