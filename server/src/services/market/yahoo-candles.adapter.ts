import type { Candle } from './candles.service.js'

type ChartPayload = { chart?: { result?: Array<{ timestamp?: number[]; indicators?: { quote?: Array<{ open?: Array<number | null>; high?: Array<number | null>; low?: Array<number | null>; close?: Array<number | null>; volume?: Array<number | null> }> } }>; error?: { description?: string } } }

export async function fetchYahooCandles(symbol: string, interval = '1d', days = 250): Promise<Candle[]> {
	const range = days > 365 ? '5y' : days > 90 ? '2y' : '1y'
	const normalizedInterval = interval === '1d' ? '1d' : interval === '1h' ? '1h' : '1d'
	const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${normalizedInterval}`, { headers: { 'user-agent': 'Borsaty/1.0', accept: 'application/json' }, signal: AbortSignal.timeout(10_000) })
	if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`)
	const payload = (await response.json()) as ChartPayload
	const result = payload.chart?.result?.[0]
	if (!result?.timestamp) throw new Error(payload.chart?.error?.description ?? 'Yahoo candles unavailable')
	const quote = result.indicators?.quote?.[0]
	if (!quote) throw new Error('Yahoo candles missing OHLCV')
	return result.timestamp.map((timestamp, index) => ({ date: new Date(timestamp * 1000).toISOString(), open: Number(quote.open?.[index]), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), close: Number(quote.close?.[index]), volume: Number(quote.volume?.[index] ?? 0) })).filter((candle) => [candle.open, candle.high, candle.low, candle.close].every((value) => Number.isFinite(value) && value > 0)).slice(-days)
}
