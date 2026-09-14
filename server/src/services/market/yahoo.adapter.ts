import { delayed } from './market.types.js'
import type { MarketEnvelope } from './market.types.js'

type YahooChart = {
	chart?: {
		result?: Array<{
			meta?: {
				symbol?: string
				regularMarketPrice?: number
				regularMarketTime?: number
				previousClose?: number
			}
			timestamp?: number[]
			indicators?: { quote?: Array<{ close?: Array<number | null> }> }
		}>
		error?: { description?: string }
	}
}

export type YahooQuote = {
	symbol: string
	value: number
	change: number | null
	changePercent: number | null
	previousClose: number | null
	updatedAt: string | null
}

async function fetchChart(symbol: string): Promise<YahooQuote> {
	const encoded = encodeURIComponent(symbol)
	const response = await fetch(
		`https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=5d&interval=1d`,
		{
			headers: { 'user-agent': 'Borsaty/1.0' },
			signal: AbortSignal.timeout(8000),
		},
	)
	if (!response.ok) throw new Error(`Yahoo Finance HTTP ${response.status}`)
	const payload = (await response.json()) as YahooChart
	const result = payload.chart?.result?.[0]
	if (!result) {
		throw new Error(
			payload.chart?.error?.description ?? 'Yahoo quote unavailable',
		)
	}
	const meta = result.meta ?? {}
	const closes = result.indicators?.quote?.[0]?.close ?? []
	const validCloses = closes.filter(
		(value): value is number =>
			typeof value === 'number' && Number.isFinite(value),
	)
	const value = Number(meta.regularMarketPrice ?? validCloses.at(-1))
	if (!Number.isFinite(value) || value <= 0)
		throw new Error('Yahoo quote has no price')
	const previous = Number(meta.previousClose ?? validCloses.at(-2))
	const previousClose =
		Number.isFinite(previous) && previous > 0 ? previous : null
	const change = previousClose == null ? null : value - previousClose
	const changePercent =
		previousClose == null ? null : (change! / previousClose) * 100
	const marketTime = Number(meta.regularMarketTime)
	const updatedAt = Number.isFinite(marketTime)
		? new Date(marketTime * 1000).toISOString()
		: null
	return {
		symbol: meta.symbol ?? symbol,
		value,
		change,
		changePercent,
		previousClose,
		updatedAt,
	}
}

export async function getYahooQuote(symbol: string): Promise<YahooQuote> {
	return fetchChart(symbol)
}

export async function getYahooDelayedEnvelope(
	symbol: string,
): Promise<MarketEnvelope<YahooQuote>> {
	return delayed('Yahoo Finance', await fetchChart(symbol))
}
