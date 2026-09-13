import { CandlesService, type CandleMarket } from '../market/candles.service.js'
import {
	calculateMACD,
	calculateRSI,
	calculateSMA,
	type Candle,
} from '../analysis/indicators.service.js'

type ComparisonRow = {
	symbol: string
	currentPrice: number
	change: number
	changePercent: number
	volume: number
	rsi: number | null
	macd: { value: number | null; signal: string }
	sma20: number | null
	sma50: number | null
	sma200: number | null
	volatility: number
	performance: Record<'1d' | '1w' | '1m' | '3m' | '1y', number>
}

function performance(prices: number[], days: number) {
	if (prices.length <= days) return 0
	return (
		((prices.at(-1)! - prices[prices.length - 1 - days]) /
			prices[prices.length - 1 - days]) *
		100
	)
}
function volatility(prices: number[]) {
	const returns = prices
		.slice(1)
		.map((price, index) => price / prices[index] - 1)
	if (returns.length < 2) return 0
	const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
	return (
		Math.sqrt(
			returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
				(returns.length - 1),
		) *
		Math.sqrt(252) *
		100
	)
}

export class ComparisonService {
	static async compare(symbols: string[], market: CandleMarket = 'EGX') {
		const normalized = [
			...new Set(
				symbols.map((symbol) => symbol.trim().toUpperCase()).filter(Boolean),
			),
		]
		if (normalized.length < 2 || normalized.length > 4)
			throw new Error('يجب اختيار 2-4 أسهم للمقارنة')
		const rows = (
			await Promise.all(
				normalized.map(async (symbol): Promise<ComparisonRow | null> => {
					const data = await CandlesService.getCandles(
						symbol,
						market,
						'1d',
						250,
					)
					if (data.candles.length < 2) return null
					const candles: Candle[] = data.candles
					const prices = candles.map((candle) => candle.close)
					const currentPrice = prices.at(-1)!
					const previous = prices.at(-2)!
					const macd = calculateMACD(candles)
					return {
						symbol,
						currentPrice,
						change: currentPrice - previous,
						changePercent: ((currentPrice - previous) / previous) * 100,
						volume: candles.at(-1)?.volume ?? 0,
						rsi: calculateRSI(candles),
						macd: {
							value: macd?.macd ?? null,
							signal:
								macd == null
									? 'unavailable'
									: macd.histogram >= 0
										? 'bullish'
										: 'bearish',
						},
						sma20: calculateSMA(candles, 20),
						sma50: calculateSMA(candles, 50),
						sma200: calculateSMA(candles, 200),
						volatility: volatility(prices),
						performance: {
							'1d': performance(prices, 1),
							'1w': performance(prices, 5),
							'1m': performance(prices, 22),
							'3m': performance(prices, 66),
							'1y': performance(prices, 250),
						},
					}
				}),
			)
		).filter((row): row is ComparisonRow => row !== null)
		if (!rows.length)
			return {
				symbols: normalized,
				timestamp: new Date().toISOString(),
				data: [],
				winner: null,
				status: 'unavailable' as const,
			}
		const closestRSI = (row: ComparisonRow) => Math.abs((row.rsi ?? 50) - 50)
		const trendScore = (row: ComparisonRow) =>
			Number(row.sma50 != null && row.currentPrice > row.sma50) +
			Number(row.sma200 != null && row.currentPrice > row.sma200)
		return {
			symbols: normalized,
			timestamp: new Date().toISOString(),
			data: rows,
			winner: {
				bestPerformance: rows.reduce((a, b) =>
					a.performance['1m'] > b.performance['1m'] ? a : b,
				).symbol,
				bestRSI: rows.reduce((a, b) => (closestRSI(a) < closestRSI(b) ? a : b))
					.symbol,
				bestTrend: rows.reduce((a, b) =>
					trendScore(a) >= trendScore(b) ? a : b,
				).symbol,
			},
			status: 'success' as const,
		}
	}
}
