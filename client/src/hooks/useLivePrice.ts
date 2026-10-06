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
const AUTO_REFRESH_MS = 180_000

const quoteUrl = (symbol: string, market: Market, force = false) => {
	const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/u, '')
	const path = force ? `/api/market/quote/${encodeURIComponent(symbol)}/refresh` : `/api/market/quote/${encodeURIComponent(symbol)}`
	return `${base}${path}?market=${market}`
}

export const useLivePrice = (symbol: string, market: Market = 'EGX') => {
	const [quote, setQuote] = useState<LivePrice | null>(null)
	const [refreshNonce, setRefreshNonce] = useState(0)

	useEffect(() => {
		let active = true
		let timer: number | undefined
		let loading = false

		const load = async (force = false) => {
			if (!active || loading || document.visibilityState === 'hidden') return
			loading = true
			const controller = new AbortController()
			const timeout = window.setTimeout(() => controller.abort(), 12_000)
			try {
				const response = await fetch(quoteUrl(symbol, market, force), {
					headers: { accept: 'application/json', ...(force ? { 'cache-control': 'no-cache' } : {}) },
					signal: controller.signal,
					cache: force ? 'no-store' : 'default',
				})
				if (!response.ok) return
				const value = (await response.json()) as LivePrice
				if (active && value.price != null) setQuote(value)
			} catch {
				/* Keep the last verified quote when a source is temporarily unavailable. */
			} finally {
				loading = false
				window.clearTimeout(timeout)
				if (active) timer = window.setTimeout(() => void load(true), AUTO_REFRESH_MS)
			}
		}

		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') void load(true)
		}
		void load(refreshNonce > 0)
		document.addEventListener('visibilitychange', onVisibilityChange)
		return () => {
			active = false
			if (timer !== undefined) window.clearTimeout(timer)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [symbol, market, refreshNonce])

	return { quote, refresh: () => setRefreshNonce((value) => value + 1) }
}
