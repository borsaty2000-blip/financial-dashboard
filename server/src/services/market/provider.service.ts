export type ProviderMarket = 'EGX' | 'TASI' | 'CRYPTO' | 'FOREX' | 'COMMODITIES'
export type FreshnessStatus =
	'live' | 'delayed' | 'eod' | 'historical' | 'unavailable'

export type ProviderTestResult = {
	provider_name: string
	is_realtime: boolean
	timestamp: string | null
	server_time: string
	age_seconds: number | null
	freshness_threshold_seconds: number
	coverage_confirmed: boolean
	data_quality: {
		status: FreshnessStatus
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
}

const defaultPriority: Record<ProviderMarket, string[]> = {
	EGX: ['sahmk', 'twelve', 'yahoo'],
	TASI: ['sahmk', 'twelve', 'yahoo'],
	CRYPTO: ['binance', 'twelve', 'yahoo'],
	FOREX: ['twelve', 'yahoo'],
	COMMODITIES: ['twelve', 'yahoo'],
}

const thresholds: Record<string, number> = {
	'1m': 30,
	'5m': 120,
	'15m': 300,
	'1h': 900,
	'1d': 86_400,
}

const configuredPriority = () => {
	try {
		const parsed = JSON.parse(
			process.env.PROVIDER_PRIORITY_JSON ?? '{}',
		) as Record<string, string[]>
		return { ...defaultPriority, ...parsed } as Record<ProviderMarket, string[]>
	} catch {
		return defaultPriority
	}
}

const thresholdFor = (interval = '1m') => {
	try {
		const configured = JSON.parse(
			process.env.FRESHNESS_THRESHOLDS_JSON ?? '{}',
		) as Record<string, number>
		return Number.isFinite(configured[interval])
			? configured[interval]
			: (thresholds[interval] ?? 60)
	} catch {
		return thresholds[interval] ?? 60
	}
}

const getTimestamp = (value: unknown) => {
	if (typeof value === 'number') {
		const millis = value < 10_000_000_000 ? value * 1000 : value
		const date = new Date(millis)
		return Number.isNaN(date.getTime()) ? null : date.toISOString()
	}
	if (typeof value === 'string') {
		const date = new Date(value)
		return Number.isNaN(date.getTime()) ? null : date.toISOString()
	}
	return null
}

const requestJson = async (url: string, init?: RequestInit) => {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(10_000),
	})
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	return response.json() as Promise<Record<string, unknown>>
}

const result = (
	provider: string,
	timestamp: string | null,
	isRealtime: boolean,
	coverageConfirmed: boolean,
	threshold: number,
	warnings: string[],
): ProviderTestResult => {
	const serverTime = new Date().toISOString()
	const age =
		timestamp == null
			? null
			: Math.max(
					0,
					Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000),
				)
	const live = Boolean(
		timestamp &&
		isRealtime &&
		coverageConfirmed &&
		age != null &&
		age <= threshold,
	)
	const finalWarnings = [...warnings]
	if (!timestamp) finalWarnings.push('المزود لم يعِد طابعاً زمنياً من المصدر')
	if (!isRealtime)
		finalWarnings.push('المزود لا يعلن أن الاستجابة realtime=true')
	if (age != null && age > threshold)
		finalWarnings.push(`عمر البيانات ${age} ثانية يتجاوز الحد ${threshold}`)
	if (!coverageConfirmed)
		finalWarnings.push('لم يتم تأكيد تغطية الرمز في الخطة الحالية')
	return {
		provider_name: provider,
		is_realtime: live,
		timestamp,
		server_time: serverTime,
		age_seconds: age,
		freshness_threshold_seconds: threshold,
		coverage_confirmed: coverageConfirmed,
		data_quality: {
			status: live ? 'live' : timestamp ? 'delayed' : 'unavailable',
			provider,
			timestamp,
			server_time: serverTime,
			age_seconds: age,
			freshness_threshold_seconds: threshold,
			realtime_tick: live && provider === 'binance',
			order_book_available: false,
			is_delayed: !live,
			warnings: finalWarnings,
		},
	}
}

export async function testProvider(
	symbol: string,
	market: ProviderMarket,
	interval = '1m',
) {
	const normalized = symbol.trim().toUpperCase()
	const threshold = thresholdFor(interval)
	const attempts: Array<Record<string, unknown>> = []
	for (const provider of configuredPriority()[market]) {
		try {
			if (provider === 'binance' && market === 'CRYPTO') {
				const data = await requestJson(
					`https://api.binance.com/api/v3/ticker/24hr?symbol=${encodeURIComponent(normalized)}`,
				)
				const timestamp = getTimestamp(data.closeTime)
				return result(
					'binance',
					timestamp,
					true,
					Boolean(data.lastPrice),
					threshold,
					[],
				)
			}
			if (
				provider === 'sahmk' &&
				(market === 'EGX' || market === 'TASI') &&
				process.env.SAHMK_API_KEY
			) {
				const data = await requestJson(
					`https://api.sahmk.sa/api/v1/quote/${encodeURIComponent(normalized)}/`,
					{ headers: { 'X-API-Key': process.env.SAHMK_API_KEY } },
				)
				const timestamp = getTimestamp(
					data.updated_at ?? data.timestamp ?? data.datetime,
				)
				const realtime = data.realtime === true && data.is_delayed !== true
				return result(
					'sahmk',
					timestamp,
					realtime,
					Number.isFinite(Number(data.price)),
					threshold,
					[],
				)
			}
			if (provider === 'twelve' && process.env.TWELVE_DATA_API_KEY) {
				const params = new URLSearchParams({
					symbol: normalized,
					apikey: process.env.TWELVE_DATA_API_KEY,
				})
				if (market === 'EGX') params.set('exchange', 'EGX')
				if (market === 'TASI') params.set('exchange', 'TADAWUL')
				const data = await requestJson(
					`https://api.twelvedata.com/quote?${params}`,
				)
				const timestamp = getTimestamp(data.timestamp ?? data.datetime)
				const realtime = data.realtime === true || data.is_realtime === true
				return result(
					'twelve',
					timestamp,
					realtime,
					Number.isFinite(Number(data.close)),
					threshold,
					[],
				)
			}
			if (provider === 'yahoo' && process.env.YAHOO_ENABLED !== 'false') {
				const yahooSymbol =
					market === 'TASI'
						? `${normalized}.SR`
						: market === 'EGX'
							? `${normalized}.CA`
							: normalized
				const data = await requestJson(
					`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}`,
				)
				const meta = (
					data.chart as
						{ result?: Array<{ meta?: Record<string, unknown> }> } | undefined
				)?.result?.[0]?.meta
				const timestamp = getTimestamp(meta?.regularMarketTime)
				return result(
					'yahoo',
					timestamp,
					false,
					Boolean(meta?.regularMarketPrice),
					threshold,
					['Yahoo Finance fallback متأخر بطبيعته'],
				)
			}
		} catch (error) {
			attempts.push({
				provider,
				error: error instanceof Error ? error.message : 'provider failed',
			})
		}
	}
	const unavailable = result('unavailable', null, false, false, threshold, [
		'لم يتوفر مزود صالح لهذا الرمز',
	])
	return { ...unavailable, attempts }
}

export const providerConfig = () => ({
	provider_priority: configuredPriority(),
	freshness_thresholds: { ...thresholds },
})
