import { EventEmitter } from 'node:events'
import type { Server as HttpServer } from 'node:http'
import { Server } from 'socket.io'
import { LiveAnalysisService } from '../stream/live-analysis.service.js'
import { attachPriceStream } from '../../sockets/price-stream.js'

export type TradingViewSignal = {
	symbol?: string
	action?: string
	price?: number
	time?: string
	[key: string]: unknown
}
const bus = new EventEmitter()
let socketServer: Server | null = null

export function attachSignalSocket(httpServer: HttpServer) {
	socketServer = new Server(httpServer, {
		cors: {
			origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173').split(','),
			credentials: true,
		},
	})
	socketServer.on('connection', (socket) => {
		socket.emit('tradingview:ready', { connected: true })
		socket.on('live:subscribe', (symbols: string[]) =>
			LiveAnalysisService.subscribe(
				socket.id,
				Array.isArray(symbols) ? symbols : [],
			),
		)
		socket.on('live:unsubscribe', (symbols: string[]) =>
			LiveAnalysisService.unsubscribe(
				socket.id,
				Array.isArray(symbols) ? symbols : [],
			),
		)
		socket.on('disconnect', () => LiveAnalysisService.removeSocket(socket.id))
		socket.on('analysis:subscribe', (symbol?: string) =>
			socket.join(`analysis:${String(symbol ?? 'market').toUpperCase()}`),
		)
	})
	LiveAnalysisService.init(socketServer)
	attachPriceStream(socketServer)
	return socketServer
}

export function publishTradingViewSignal(signal: TradingViewSignal) {
	bus.emit('signal', signal)
	socketServer?.emit('tradingview:signal', signal)
	publishAnalysisStream(signal)
}

export function publishAnalysisStream(payload: unknown, symbol?: string) {
	if (symbol)
		socketServer
			?.to(`analysis:${symbol.toUpperCase()}`)
			.emit('analysis:stream', payload)
	else socketServer?.emit('analysis:stream', payload)
}

export function onTradingViewSignal(
	listener: (signal: TradingViewSignal) => void,
) {
	bus.on('signal', listener)
	return () => bus.off('signal', listener)
}
export function publishUserNotification(userId: string, notification: unknown) {
	socketServer?.to(`user:${userId}`).emit('notification', notification)
}
