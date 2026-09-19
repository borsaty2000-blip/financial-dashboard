import type { Candle } from './candles.service.js'

export async function fetchBinanceCandles(symbol: string, interval = '1d', limit = 250): Promise<Candle[]> {
	const normalized = symbol.replace('/', '').toUpperCase()
	const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(normalized)}&interval=${encodeURIComponent(interval)}&limit=${Math.min(Math.max(limit, 1), 1000)}`
	const result = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } })
	if (!result.ok) throw new Error(`Binance HTTP ${result.status}`)
	const data = (await result.json()) as unknown
	if (!Array.isArray(data)) throw new Error('Binance returned invalid candles')
	return data.map((row) => {
		if (!Array.isArray(row) || row.length < 6) throw new Error('Binance candle row invalid')
		return {
			date: new Date(Number(row[0])).toISOString(),
			open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5]),
		}
	}).filter((candle) => [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0))
}
