import { useEffect, useState } from 'react'

export type LivePrice = {
	symbol: string
	price: number | null
	changePercent: number | null
	freshness: 'live' | 'delayed' | 'cached'
	source: string
	updatedAt: string | null
	delayMinutes?: number | null
	dataQuality?: 'live' | 'delayed' | 'historical' | 'cached'
	warnings?: string[]
}

type Market = 'EGX' | 'TASI' | 'GLOBAL'
const LIVE_POLL_INTERVAL_MS = 5_000
const DELAYED_POLL_INTERVAL_MS = 30_000

const quoteUrl = (symbol: string, market: Market) => {
	const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/u, '')
	return `${base}/api/market/quote/${encodeURIComponent(symbol)}?market=${market}`
}

export const useLivePrice = (symbol: string, market: Market = 'EGX') => {
	const [quote, setQuote] = useState<LivePrice | null>(null)

	useEffect(() => {
		let active = true
		let timer: number | undefined
		let loading = false
		let lastFreshness: LivePrice['freshness'] = 'delayed'

		const load = async () => {
			if (!active || loading || document.visibilityState === 'hidden') return
			loading = true
			const controller = new AbortController()
			const timeout = window.setTimeout(() => controller.abort(), 12_000)
			try {
				const response = await fetch(quoteUrl(symbol, market), {
					headers: { accept: 'application/json' },
					signal: controller.signal,
				})
				if (!response.ok) return
				const value = (await response.json()) as LivePrice
				if (active && value.price != null) {
					lastFreshness = value.freshness
					setQuote(value)
				}
			} catch {
				/* Keep the last verified quote; historical data remains visible. */
			} finally {
				loading = false
				window.clearTimeout(timeout)
				if (active) {
					const interval =
						lastFreshness === 'live'
							? LIVE_POLL_INTERVAL_MS
							: DELAYED_POLL_INTERVAL_MS
					timer = window.setTimeout(() => void load(), interval)
				}
			}
		}

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') void load()
		}
		void load()
		document.addEventListener('visibilitychange', onVisibilityChange)
		return () => {
			active = false
			if (timer !== undefined) window.clearTimeout(timer)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [symbol, market])

	return quote
}
