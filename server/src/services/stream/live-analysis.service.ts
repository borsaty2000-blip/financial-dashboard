import type { Server as SocketServer } from 'socket.io'
import { ConsensusService } from '../analysis/consensus.service.js'
import { CandlesService } from '../market/candles.service.js'

type SubscriptionMap = Map<string, Set<string>>

export class LiveAnalysisService {
	private static io: SocketServer | null = null
	private static subscriptions: SubscriptionMap = new Map()
	private static running = false

	static init(io: SocketServer) {
		this.io = io
		if (this.running) return
		this.running = true
		setInterval(() => void this.broadcast(), 60_000)
	}

	static subscribe(socketId: string, symbols: string[]) {
		const set = this.subscriptions.get(socketId) ?? new Set<string>()
		for (const symbol of symbols.slice(0, 20)) {
			if (/^[A-Z0-9.^_-]{1,20}$/i.test(symbol)) set.add(symbol.toUpperCase())
		}
		this.subscriptions.set(socketId, set)
	}

	static unsubscribe(socketId: string, symbols: string[]) {
		const set = this.subscriptions.get(socketId)
		if (!set) return
		for (const symbol of symbols) set.delete(symbol.toUpperCase())
		if (!set.size) this.subscriptions.delete(socketId)
	}

	static removeSocket(socketId: string) {
		this.subscriptions.delete(socketId)
	}

	private static async broadcast() {
		const symbols = new Set<string>()
		for (const subscribed of this.subscriptions.values())
			subscribed.forEach((symbol) => symbols.add(symbol))
		for (const symbol of symbols) {
			try {
				const candles = await CandlesService.getCandles(
					symbol,
					'EGX',
					'1d',
					250,
				)
				if (candles.candles.length < 50) continue
				const consensus = await ConsensusService.calculate(
					symbol,
					candles.candles.map((candle) => candle.close),
					candles.candles.map((candle) => candle.date),
				)
				for (const [socketId, subscribed] of this.subscriptions) {
					if (subscribed.has(symbol))
						this.io?.to(socketId).emit('analysis:update', {
							symbol,
							consensus,
							timestamp: new Date().toISOString(),
						})
				}
			} catch (error) {
				this.io?.emit('analysis:error', {
					symbol,
					message:
						error instanceof Error ? error.message : 'تعذر تحديث التحليل',
				})
			}
		}
	}
}
