import type { Candle } from './candles.service.js'

export async function fetchBinanceCandles(symbol: string, interval = '1d', limit = 250): Promise<Candle[]> {
	const normalized = symbol.replace('/', '').toUpperCase()
	const query = `symbol=${encodeURIComponent(normalized)}&interval=${encodeURIComponent(interval)}&limit=${Math.min(Math.max(limit, 1), 1000)}`
	const hosts = ['api.binance.com', 'api1.binance.com', 'api2.binance.com', 'api3.binance.com']
	let data: unknown
	let lastError = 'Binance candles unavailable'
	for (const host of hosts) {
		try {
			const result = await fetch(`https://${host}/api/v3/klines?${query}`, {
				signal: AbortSignal.timeout(10_000),
				headers: { accept: 'application/json' },
			})
			if (!result.ok) {
				lastError = `Binance HTTP ${result.status}`
				continue
			}
			data = await result.json()
			if (Array.isArray(data)) break
			lastError = 'Binance returned invalid candles'
		} catch (error) {
			lastError = error instanceof Error ? error.message : String(error)
		}
	}
	if (!Array.isArray(data)) throw new Error(lastError)
	return data.map((row) => {
		if (!Array.isArray(row) || row.length < 6) throw new Error('Binance candle row invalid')
		return {
			date: new Date(Number(row[0])).toISOString(),
			open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
		}
	}).filter((candle) => [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0))
}
