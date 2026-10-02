export type QualityStatus =
	| 'live'
	| 'same_day'
	| 'historical'
	| 'unavailable'
	// Legacy values are accepted at service boundaries and normalized on output.
	| 'delayed'
	| 'eod'

export type CanonicalQualityStatus = 'live' | 'same_day' | 'historical' | 'unavailable'

export type DataQuality = {
	status: CanonicalQualityStatus
	freshness_ar: 'محدّث الآن' | 'محدّث اليوم' | 'تاريخي'
	provider: 'market'
	timestamp: string | null
	server_time: string
	age_seconds: number
	freshness_threshold_seconds: number
	realtime_tick: boolean
	order_book_available: boolean
	is_delayed: boolean
	warnings: string[]
}

const ageSecondsFor = (timestamp: string | null) => {
	if (!timestamp) return Number.POSITIVE_INFINITY
	const parsed = new Date(timestamp).getTime()
	return Number.isFinite(parsed)
		? Math.max(0, Math.floor((Date.now() - parsed) / 1000))
		: Number.POSITIVE_INFINITY
}

const canonicalStatus = (
	input: QualityStatus,
	ageSeconds: number,
): CanonicalQualityStatus => {
	if (input === 'unavailable') return 'unavailable'
	if (ageSeconds < 300 && input === 'live') return 'live'
	if (ageSeconds < 86400) return 'same_day'
	return 'historical'
}

export function makeDataQuality(input: {
	status: QualityStatus
	provider?: string
	timestamp?: string | null
	thresholdSeconds?: number
	warnings?: string[]
	realtimeTick?: boolean
	orderBookAvailable?: boolean
}): DataQuality {
	const serverTime = new Date().toISOString()
	const timestamp = input.timestamp ?? null
	const ageSeconds = ageSecondsFor(timestamp)
	const status = canonicalStatus(input.status, ageSeconds)
	const warnings = [...(input.warnings ?? [])]
	if (!timestamp && status !== 'unavailable')
		warnings.push('لا يتوفر طابع زمني موثوق')
	return {
		status,
		freshness_ar:
			status === 'live'
				? 'محدّث الآن'
				: status === 'same_day'
					? 'محدّث اليوم'
					: 'تاريخي',
		provider: 'market',
		timestamp,
		server_time: serverTime,
		age_seconds: Number.isFinite(ageSeconds) ? ageSeconds : 0,
		freshness_threshold_seconds: input.thresholdSeconds ?? 300,
		realtime_tick: Boolean(input.realtimeTick && status === 'live'),
		order_book_available: Boolean(input.orderBookAvailable),
		is_delayed: status !== 'live',
		warnings: [...new Set(warnings)],
	}
}

export function qualityForSeries(
	_provider: string,
	freshness: 'live' | 'delayed' | 'cached',
	timestamp: string | null,
): DataQuality {
	const effectiveTimestamp =
		freshness === 'delayed'
			? new Date(Date.now() - 900_000).toISOString()
			: timestamp
	const status: QualityStatus =
		freshness === 'live' ? 'live' : freshness === 'cached' ? 'historical' : 'same_day'
	return makeDataQuality({
		status,
		timestamp: effectiveTimestamp,
		thresholdSeconds: 300,
		realtimeTick: status === 'live',
	})
}
