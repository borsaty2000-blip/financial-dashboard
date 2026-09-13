import { live, unavailable, type MarketEnvelope } from './market.types.js'

const baseUrl = (
	process.env.SAHMK_BASE_URL ?? 'https://api.sahmk.sa/api/v1'
).replace(/\/$/, '')

async function request<T>(
	path: string,
	params?: Record<string, string | number>,
) {
	const apiKey = process.env.SAHMK_API_KEY
	if (!apiKey) throw new Error('SAHMK_API_KEY is not configured')
	const url = new URL(`${baseUrl}${path}`)
	for (const [key, value] of Object.entries(params ?? {}))
		url.searchParams.set(key, String(value))
	const response = await fetch(url, { headers: { 'X-API-Key': apiKey } })
	const body = await response.json().catch(() => ({}))
	if (!response.ok)
		throw new Error(`SAHMK ${response.status}: ${JSON.stringify(body)}`)
	return body as T
}

export async function getTasiSummary(): Promise<MarketEnvelope<unknown>> {
	try {
		return live('SAHMK', await request('/market/summary/', { index: 'TASI' }))
	} catch (error) {
		return unavailable(
			'SAHMK',
			error instanceof Error ? error.message : 'SAHMK unavailable',
		)
	}
}

export async function getTasiQuote(
	symbol: string,
): Promise<MarketEnvelope<unknown>> {
	try {
		return live('SAHMK', await request(`/quote/${encodeURIComponent(symbol)}/`))
	} catch (error) {
		return unavailable(
			'SAHMK',
			error instanceof Error ? error.message : 'SAHMK unavailable',
		)
	}
}

export async function getTasiCompanies(
	search?: string,
): Promise<MarketEnvelope<unknown>> {
	try {
		return live(
			'SAHMK',
			await request('/companies/', search ? { search } : undefined),
		)
	} catch (error) {
		return unavailable(
			'SAHMK',
			error instanceof Error ? error.message : 'SAHMK unavailable',
		)
	}
}
