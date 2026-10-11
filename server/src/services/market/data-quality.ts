export type QualityStatus =
	| 'live'
	| 'same_day'
	| 'historical'
	| 'unavailable'
	// Legacy values are accepted at service boundaries and normalized on output.
	| 'delayed'
	| 'eod'

export type CanonicalQualityStatus =
	'live' | 'same_day' | 'historical' | 'unavailable'

export type DataQuality = {
	status: CanonicalQualityStatus
	freshness_ar: 'محدّث الآن' | 'محدّث اليوم' | 'آخر إغلاق' | 'تاريخي'
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

const calendarDayAgeFor = (timestamp: string | null) => {
	if (!timestamp) return Number.POSITIVE_INFINITY
	const parsed = new Date(timestamp)
	if (!Number.isFinite(parsed.getTime())) return Number.POSITIVE_INFINITY
	const now = new Date()
	const today = Date.UTC(
		now.getUTCFullYear(),
		now.getUTCMonth(),
		now.getUTCDate(),
	)
	const date = Date.UTC(
		parsed.getUTCFullYear(),
		parsed.getUTCMonth(),
		parsed.getUTCDate(),
	)
	return Math.max(0, Math.floor((today - date) / 86_400_000))
}

export type MarketStatus = 'open' | 'closed' | 'weekend'

export function getMarketStatus(market: string): MarketStatus {
	const now = new Date()
	const dayOfWeek = now.getUTCDay()
	if (market === 'EGX' || market === 'TASI') {
		if (dayOfWeek === 5 || dayOfWeek === 6) return 'weekend'
		const localHour = now.getUTCHours() + (market === 'EGX' ? 2 : 3)
		const closeHour = market === 'EGX' ? 16 : 15
		return localHour >= 10 && localHour < closeHour ? 'open' : 'closed'
	}
	return 'open'
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
	market?: string
}): DataQuality {
	const serverTime = new Date().toISOString()
	const timestamp = input.timestamp ?? null
	const ageSeconds = ageSecondsFor(timestamp)
	const marketStatus = input.market ? getMarketStatus(input.market) : 'open'
	const calendarDayAge = calendarDayAgeFor(timestamp)
	const weekendClose =
		marketStatus === 'weekend' &&
		input.status !== 'historical' &&
		ageSeconds >= 300 &&
		calendarDayAge <= 3
	const closedSameDay =
		marketStatus === 'closed' &&
		input.status !== 'historical' &&
		ageSeconds >= 300 &&
		calendarDayAge === 0

	let status: CanonicalQualityStatus
	let freshness_ar: DataQuality['freshness_ar']
	if (input.status === 'unavailable') {
		status = 'unavailable'
		freshness_ar = 'تاريخي'
	} else if (weekendClose) {
		status = 'same_day'
		freshness_ar = 'آخر إغلاق'
	} else if (closedSameDay) {
		status = 'same_day'
		freshness_ar = 'آخر إغلاق'
	} else {
		status = canonicalStatus(input.status, ageSeconds)
		freshness_ar =
			status === 'live'
				? 'محدّث الآن'
				: status === 'same_day'
					? 'محدّث اليوم'
					: 'تاريخي'
	}

	const warnings = [...(input.warnings ?? [])]
	if (!timestamp && status !== 'unavailable')
		warnings.push('لا يتوفر طابع زمني موثوق')
	return {
		status,
		freshness_ar,
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
	market = 'GLOBAL',
): DataQuality {
	const effectiveTimestamp =
		freshness === 'delayed'
			? new Date(Date.now() - 900_000).toISOString()
			: timestamp
	const status: QualityStatus =
		freshness === 'live'
			? 'live'
			: freshness === 'cached'
				? 'historical'
				: 'same_day'
	return makeDataQuality({
		status,
		timestamp: effectiveTimestamp,
		thresholdSeconds: 300,
		realtimeTick: status === 'live',
		market,
	})
}
