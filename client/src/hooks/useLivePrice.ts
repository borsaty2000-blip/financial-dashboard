import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'

export type LivePrice = {
	symbol: string
	price: number | null
	changePercent: number | null
	freshness: 'live' | 'delayed' | 'cached'
	source: string
	updatedAt: string | null
}
export function useLivePrice(symbol: string, market = 'EGX') {
	const [quote, setQuote] = useState<LivePrice | null>(null)
	useEffect(() => {
		const socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
			transports: ['websocket', 'polling'],
		})
		const onUpdate = (value: LivePrice) => {
			if (value.symbol === symbol.toUpperCase()) setQuote(value)
		}
		socket.emit('price:subscribe', { symbols: [symbol], market })
		socket.on('price:update', onUpdate)
		return () => {
			socket.off('price:update', onUpdate)
			socket.close()
		}
	}, [symbol, market])
	return quote
}
