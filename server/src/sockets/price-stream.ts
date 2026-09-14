import type { Server as SocketServer, Socket } from 'socket.io'
import {
	CandlesService,
	type CandleMarket,
} from '../services/market/candles.service.js'

const active = new Map<string, Set<string>>()
let timer: NodeJS.Timeout | null = null

export function attachPriceStream(io: SocketServer) {
	const register = (socket: Socket) => {
		socket.on(
			'price:subscribe',
			(payload: { symbols?: string[]; market?: CandleMarket }) => {
				const market = payload?.market ?? 'EGX'
				const symbols = (payload?.symbols ?? [])
					.filter((symbol) => /^[A-Z0-9._-]{1,20}$/i.test(symbol))
					.slice(0, 30)
					.map((symbol) => symbol.toUpperCase())
				active.set(
					socket.id,
					new Set(symbols.map((symbol) => `${market}:${symbol}`)),
				)
			},
		)
		socket.on('disconnect', () => active.delete(socket.id))
	}
	io.on('connection', register)
	io.of('/api/v1/ws/prices').on('connection', register)
	if (!timer) timer = setInterval(() => void broadcast(io), 1000)
}

async function broadcast(io: SocketServer) {
	const requests = new Set<string>()
	for (const symbols of active.values())
		symbols.forEach((symbol) => requests.add(symbol))
	await Promise.all(
		[...requests].map(async (key) => {
			const [market, symbol] = key.split(':') as [CandleMarket, string]
			const quote = await CandlesService.getQuote(symbol, market)
			for (const [socketId, symbols] of active)
				if (symbols.has(key))
					io.to(socketId).emit('price:update', {
						...quote,
						timestamp: new Date().toISOString(),
					})
		}),
	)
}
