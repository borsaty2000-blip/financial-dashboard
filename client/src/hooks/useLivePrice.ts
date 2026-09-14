import { useEffect, useState } from 'react'

export type LivePrice = {
	symbol: string
	price: number | null
	changePercent: number | null
	freshness: 'live' | 'delayed' | 'cached'
	source: string
	updatedAt: string | null
}

type Market = 'EGX' | 'TASI' | 'GLOBAL'
const QUOTE_POLL_INTERVAL_MS = 30_000

const quoteUrl = (symbol: string, market: Market) => {
	const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
	return `${base}/api/market/quote/${encodeURIComponent(symbol)}?market=${market}`
}

export const useLivePrice = (symbol: string, market: Market = 'EGX') => {
	const [quote, setQuote] = useState<LivePrice | null>(null)

	useEffect(() => {
		let active = true
		const load = async () => {
			if (document.visibilityState === 'hidden') return
			const controller = new AbortController()
			const timeout = window.setTimeout(() => controller.abort(), 12_000)
			try {
				const response = await fetch(quoteUrl(symbol, market), {
					headers: { accept: 'application/json' },
					signal: controller.signal,
				})
				if (!response.ok) return
				const value = (await response.json()) as LivePrice
				if (active && value.price != null) setQuote(value)
			} catch {
				/* keep the last verified quote; the historical-card fallback remains visible */
			} finally {
				window.clearTimeout(timeout)
			}
		}
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') void load()
		}
		void load()
		const timer = window.setInterval(() => void load(), QUOTE_POLL_INTERVAL_MS)
		document.addEventListener('visibilitychange', onVisibilityChange)
		return () => {
			active = false
			window.clearInterval(timer)
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
	}, [symbol, market])

	return quote
}
