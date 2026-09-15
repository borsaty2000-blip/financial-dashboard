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

/**
 * Keltner Channels: EMA of close ± multiplier × ATR using true range.
 * The calculation is intentionally unavailable when OHLC data is incomplete;
 * close-only series must not be presented as a fully calculated channel.
 */
export function calculateKeltnerChannels(
	candles: Candle[],
	period = 20,
	atrPeriod = 10,
	multiplier = 2,
) {
	if (
		candles.length < period + atrPeriod ||
		candles.some((candle) => candle.high == null || candle.low == null)
	)
		return null
	const ema = calculateEMA(candles, period)
	const ranges: number[] = []
	for (let index = 0; index < candles.length; index += 1) {
		const candle = candles[index]
		const previousClose = candles[index - 1]?.close ?? candle.close
		ranges.push(
			Math.max(
				candle.high! - candle.low!,
				Math.abs(candle.high! - previousClose),
				Math.abs(candle.low! - previousClose),
			),
		)
	}
	const atr =
		ranges.slice(-atrPeriod).reduce((sum, value) => sum + value, 0) / atrPeriod
	if (ema == null || !Number.isFinite(atr)) return null
	return {
		middle: ema,
		upper: ema + multiplier * atr,
		lower: ema - multiplier * atr,
		atr,
		period,
		multiplier,
		position:
			candles.at(-1)!.close > ema + multiplier * atr
				? 'above'
				: candles.at(-1)!.close < ema - multiplier * atr
					? 'below'
					: 'inside',
	}
}

/**
 * Trend angle is the least-squares slope over normalized price, expressed in
 * degrees per candle. Normalizing by mean price makes the angle comparable
 * across instruments with different price scales; it is not a chart-screen
 * angle and must be interpreted with the selected window.
 */
export function calculateTrendAngle(candles: Candle[], period = 20) {
	if (candles.length < period) return null
	const closes = candles.slice(-period).map((candle) => candle.close)
	const mean = closes.reduce((sum, value) => sum + value, 0) / period
	if (!Number.isFinite(mean) || mean <= 0) return null
	const xMean = (period - 1) / 2
	const numerator = closes.reduce(
		(sum, value, index) => sum + (index - xMean) * (value - mean),
		0,
	)
	const denominator = closes.reduce(
		(sum, _, index) => sum + (index - xMean) ** 2,
		0,
	)
	const slope = numerator / denominator
	const percentPerCandle = (slope / mean) * 100
	const angleDegrees = (Math.atan(percentPerCandle / 100) * 180) / Math.PI
	return {
		period,
		slope,
		percentPerCandle,
		angleDegrees,
		direction:
			angleDegrees > 0.25 ? 'up' : angleDegrees < -0.25 ? 'down' : 'flat',
		strength:
			Math.abs(angleDegrees) >= 2
				? 'strong'
				: Math.abs(angleDegrees) >= 0.25
					? 'moderate'
					: 'weak',
	}
}

/**
 * Fibonacci swing map with ATR-sized dynamic zones. The latest completed
 * lookback window is used, and the impulse direction follows the order of
 * the detected swing low/high rather than a guessed market direction.
 */
export function calculateAdvancedFibonacci(
	candles: Candle[],
	lookback = 120,
	atrPeriod = 14,
) {
	const window = candles.slice(-lookback)
	if (
		window.length < 30 ||
		window.some((candle) => candle.high == null || candle.low == null)
	)
		return null
	let highIndex = 0
	let lowIndex = 0
	for (let index = 1; index < window.length; index += 1) {
		if (window[index].high! > window[highIndex].high!) highIndex = index
		if (window[index].low! < window[lowIndex].low!) lowIndex = index
	}
	const swingHigh = window[highIndex].high!
	const swingLow = window[lowIndex].low!
	const range = swingHigh - swingLow
	if (!Number.isFinite(range) || range <= 0) return null
	const direction = lowIndex < highIndex ? 'up' : 'down'
	const ratios = [0.236, 0.382, 0.5, 0.618, 0.786]
	const retracement = Object.fromEntries(
		ratios.map((ratio) => [
			String(ratio),
			direction === 'up' ? swingHigh - range * ratio : swingLow + range * ratio,
		]),
	)
	const extensions = {
		'1.272':
			direction === 'up' ? swingHigh + range * 0.272 : swingLow - range * 0.272,
		'1.618':
			direction === 'up' ? swingHigh + range * 0.618 : swingLow - range * 0.618,
	}
	const close = window.at(-1)!.close
	const atr = calculateATR(window, atrPeriod)
	if (atr == null || !Number.isFinite(atr) || atr <= 0) return null
	const levels = Object.values(retracement).filter((level) =>
		Number.isFinite(level),
	)
	const supports = levels.filter((level) => level <= close)
	const resistances = levels.filter((level) => level >= close)
	const support = supports.length ? Math.max(...supports) : swingLow
	const resistance = resistances.length ? Math.min(...resistances) : swingHigh
	const zoneWidth = atr * 0.5
	return {
		lookback: window.length,
		atr,
		direction,
		swingHigh,
		swingLow,
		range,
		retracement,
		extensions,
		dynamicSupport: {
			level: support,
			lower: support - zoneWidth,
			upper: support + zoneWidth,
		},
		dynamicResistance: {
			level: resistance,
			lower: resistance - zoneWidth,
			upper: resistance + zoneWidth,
		},
	}
}

export function calculateIndicatorSnapshot(symbol: string, candles: Candle[]) {
	const closes = candles.map((candle) => candle.close)
	const rsi = calculateRSI(candles)
	const macd = calculateMACD(candles)
	const sma20 = calculateSMA(candles, 20)
	const sma50 = calculateSMA(candles, 50)
	const bollinger = calculateBollinger(candles)
	const atr = calculateATR(candles)
	const keltner = calculateKeltnerChannels(candles)
	const trendAngle = calculateTrendAngle(candles)
	const fibonacci = calculateAdvancedFibonacci(candles)
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
		keltner,
		trendAngle,
		fibonacci,
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
