export type QualityStatus =
	| 'live'
	| 'delayed'
	| 'eod'
	| 'historical'
	| 'unavailable'

export type DataQuality = {
	status: QualityStatus
	provider: string
	timestamp: string | null
	server_time: string
	age_seconds: number | null
	freshness_threshold_seconds: number
	realtime_tick: boolean
	order_book_available: boolean
	is_delayed: boolean
	warnings: string[]
}

export function makeDataQuality(input: {
	status: QualityStatus
	provider: string
	timestamp?: string | null
	thresholdSeconds?: number
	warnings?: string[]
	realtimeTick?: boolean
	orderBookAvailable?: boolean
}): DataQuality {
	const serverTime = new Date().toISOString()
	const timestamp = input.timestamp ?? null
	const age = timestamp
		? Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000))
		: null
	const threshold = input.thresholdSeconds ?? 60
	const warnings = [...(input.warnings ?? [])]
	if (!timestamp && input.status !== 'unavailable')
		warnings.push('لا يتوفر طابع زمني موثوق من المصدر')
	if (input.status !== 'live' && input.status !== 'unavailable')
		warnings.push('البيانات ليست بثاً لحظياً مؤكداً')
	return {
		status: input.status,
		provider: input.provider,
		timestamp,
		server_time: serverTime,
		age_seconds: age,
		freshness_threshold_seconds: threshold,
		realtime_tick: Boolean(input.realtimeTick && input.status === 'live'),
		order_book_available: Boolean(input.orderBookAvailable),
		is_delayed: input.status !== 'live',
		warnings: [...new Set(warnings)],
	}
}

export function qualityForSeries(
	provider: string,
	freshness: 'live' | 'delayed' | 'cached',
	timestamp: string | null,
): DataQuality {
	const status =
		freshness === 'live'
			? 'live'
			: freshness === 'cached'
				? 'historical'
				: 'delayed'
	return makeDataQuality({
		status,
		provider,
		timestamp,
		thresholdSeconds: 300,
		realtimeTick: status === 'live',
	})
}
