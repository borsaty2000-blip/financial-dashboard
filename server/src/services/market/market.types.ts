export type MarketSource =
	'EGX MCP' | 'SAHMK' | 'Twelve Data' | 'Yahoo Finance' | 'mixed'
export type Freshness = 'live' | 'delayed' | 'cached'

export type MarketEnvelope<T> = {
	data: T
	source: MarketSource
	timestamp: string
	freshness: Freshness
	delay_minutes: number
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

export function delayed<T>(
	source: MarketSource,
	data: T,
	delayMinutes = 15,
): MarketEnvelope<T> {
	return {
		data,
		source,
		timestamp: new Date().toISOString(),
		freshness: 'delayed',
		delay_minutes: delayMinutes,
		available: true,
	}
}
