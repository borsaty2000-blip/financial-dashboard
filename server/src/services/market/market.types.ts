export type MarketSource = 'EGX MCP' | 'SAHMK' | 'Twelve Data Pro' | 'mixed'
export type Freshness = 'live' | 'delayed' | 'cached'

export type MarketEnvelope<T> = {
	data: T
	source: MarketSource
	timestamp: string
	freshness: Freshness
	delay_minutes: 0 | 15
	available: boolean
	error?: string
}

export function unavailable<T>(
	source: MarketSource,
	error: string,
): MarketEnvelope<T> {
	return {
		data: {} as T,
		source,
		timestamp: new Date().toISOString(),
		freshness: 'cached',
		delay_minutes: 15,
		available: false,
		error,
	}
}

export function live<T>(source: MarketSource, data: T): MarketEnvelope<T> {
	return {
		data,
		source,
		timestamp: new Date().toISOString(),
		freshness: 'live',
		delay_minutes: 0,
		available: true,
	}
}
