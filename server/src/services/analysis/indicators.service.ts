import { ATR, BollingerBands, EMA, MACD, RSI, SMA } from 'trading-signals'
import { Sharpe, positionSizing } from 'finmagic'

export type Candle = {
	close: number
	high?: number
	low?: number
	open?: number
	volume?: number
}

function last<T>(value: T | null, fallback: T | null = null) {
	return value ?? fallback
}

export function calculateSMA(candles: Candle[], period: number) {
	const indicator = new SMA(period)
	let result: number | null = null
	for (const candle of candles) result = indicator.update(candle.close, false)
	return result
}

export function calculateEMA(candles: Candle[], period: number) {
	const indicator = new EMA(period)
	let result: number | null = null
	for (const candle of candles) result = indicator.update(candle.close, false)
	return result
}

export function calculateRSI(candles: Candle[], period = 14) {
	const indicator = new RSI(period)
	let result: number | null = null
	for (const candle of candles) result = indicator.update(candle.close, false)
	return result
}

export function calculateMACD(candles: Candle[]) {
	const indicator = new MACD(new EMA(12), new EMA(26), new EMA(9))
	let result: { macd: number; signal: number; histogram: number } | null = null
	for (const candle of candles) result = indicator.update(candle.close, false)
	return result
}

export function calculateBollinger(candles: Candle[], period = 20, stdDev = 2) {
	const indicator = new BollingerBands(period, stdDev)
	let result: { upper: number; middle: number; lower: number } | null = null
	for (const candle of candles) result = indicator.update(candle.close, false)
	return result
}

export function calculateATR(candles: Candle[], period = 14) {
	const indicator = new ATR(period)
	let result: number | null = null
	for (const candle of candles) {
		if (candle.high == null || candle.low == null) continue
		result = indicator.update(
			{ high: candle.high, low: candle.low, close: candle.close },
			false,
		)
	}
	return result
}

export function calculateIndicatorSnapshot(symbol: string, candles: Candle[]) {
	const closes = candles.map((candle) => candle.close)
	const rsi = calculateRSI(candles)
	const macd = calculateMACD(candles)
	const sma20 = calculateSMA(candles, 20)
	const sma50 = calculateSMA(candles, 50)
	const bollinger = calculateBollinger(candles)
	const atr = calculateATR(candles)
	const recommendation =
		rsi == null || macd == null
			? 'HOLD'
			: rsi < 30 && macd.histogram > 0
				? 'BUY'
				: rsi > 70 && macd.histogram < 0
					? 'SELL'
					: 'HOLD'
	return {
		symbol,
		count: closes.length,
		rsi: {
			value: last(rsi),
			signal:
				rsi == null
					? 'unavailable'
					: rsi < 30
						? 'oversold'
						: rsi > 70
							? 'overbought'
							: 'neutral',
		},
		macd: {
			value: last(macd?.macd ?? null),
			signal:
				macd == null
					? 'unavailable'
					: macd.histogram >= 0
						? 'bullish'
						: 'bearish',
		},
		sma20,
		sma50,
		bollinger,
		atr,
		risk:
			closes.length > 1
				? {
						sharpe: Sharpe(
							closes.slice(1).map((value, index) => value / closes[index] - 1),
						),
						positionSize:
							atr && atr > 0 ? positionSizing(100000, 0.02, atr) : null,
					}
				: null,
		recommendation,
	}
}
