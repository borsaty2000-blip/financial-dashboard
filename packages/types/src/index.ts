export type Market =
	'EGX' | 'TASI' | 'DFM' | 'ADX' | 'QSE' | 'GOLD' | 'FOREX' | 'CRYPTO'
export type Freshness = 'live' | 'delayed' | 'cached' | 'stale' | 'unavailable'
export type DataEnvelope<T> = {
	status: 'success' | 'unavailable' | 'error'
	data?: T
	message?: string
	requestId?: string
	timestamp: string
	freshness: Freshness
	provenance?: {
		provider: string
		fetchedAt: string
		delayedByMinutes?: number
	}
}
export type Quote = {
	symbol: string
	market: Market
	price: number | null
	change: number | null
	changePercent: number | null
	currency: string
	timestamp: string
}
export type Candle = {
	time: string
	open: number
	high: number
	low: number
	close: number
	volume?: number | null
}
export type AnalysisDisclaimer = {
	educational: true
	text: 'تحليل تعليمي وليس توصية استثمارية'
}
