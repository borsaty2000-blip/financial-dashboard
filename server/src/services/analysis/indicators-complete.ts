import type { Candle } from './indicators.service.js'

export type CompleteCandle = Candle & { timestamp?: string | number }
export type Signal = 'BUY' | 'SELL' | 'NEUTRAL'
export type SignalStrength = 'weak' | 'moderate' | 'strong'

export type IndicatorResult<T> = {
	value: T
	signal: Signal
	strength: SignalStrength
	formula: string
	parameters: Record<string, number | string>
}

const EPS = 1e-12
const close = (c: CompleteCandle) => c.close
const high = (c: CompleteCandle) => c.high ?? c.close
const low = (c: CompleteCandle) => c.low ?? c.close
const volume = (c: CompleteCandle) => c.volume ?? 0
const finite = (value: number) => Number.isFinite(value)
const round = (value: number, digits = 6) => {
	if (!finite(value)) return value
	const factor = 10 ** digits
	return Math.round(value * factor) / factor
}
const tail = <T>(values: T[], period: number) => values.slice(Math.max(0, values.length - period))
const mean = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null
const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)
const min = (values: number[]) => values.length ? Math.min(...values) : null
const max = (values: number[]) => values.length ? Math.max(...values) : null
const closes = (candles: CompleteCandle[]) => candles.map(close)
const highs = (candles: CompleteCandle[]) => candles.map(high)
const lows = (candles: CompleteCandle[]) => candles.map(low)
const volumes = (candles: CompleteCandle[]) => candles.map(volume)
const enough = (candles: CompleteCandle[], period: number) => candles.length >= Math.max(1, period)

function result<T>(value: T, formula: string, parameters: Record<string, number | string>, signal: Signal = 'NEUTRAL', strength: SignalStrength = 'weak'): IndicatorResult<T> {
	return { value, signal, strength, formula, parameters }
}
function directional(value: number, bullish: number, bearish: number, formula: string, parameters: Record<string, number | string>): IndicatorResult<number> {
	const signal = value > bullish ? 'BUY' : value < bearish ? 'SELL' : 'NEUTRAL'
	const distance = signal === 'NEUTRAL' ? 0 : Math.min(1, Math.abs(value - (signal === 'BUY' ? bullish : bearish)) / Math.max(Math.abs(bullish - bearish), EPS))
	return result(round(value), formula, parameters, signal, distance > 0.66 ? 'strong' : distance > 0.25 ? 'moderate' : 'weak')
}
function smaValues(values: number[], period: number) {
	return values.length < period ? null : mean(tail(values, period))
}
function emaValues(values: number[], period: number) {
	if (values.length < period || period < 1) return null
	let ema = mean(values.slice(0, period))!
	const alpha = 2 / (period + 1)
	for (const value of values.slice(period)) ema = alpha * value + (1 - alpha) * ema
	return ema
}
function wmaValues(values: number[], period: number) {
	if (values.length < period || period < 1) return null
	const window = tail(values, period)
	const denominator = (period * (period + 1)) / 2
	return sum(window.map((value, index) => value * (index + 1))) / denominator
}
function trueRanges(candles: CompleteCandle[]) {
	return candles.map((candle, index) => {
		const previous = candles[index - 1]?.close ?? candle.close
		return Math.max(high(candle) - low(candle), Math.abs(high(candle) - previous), Math.abs(low(candle) - previous))
	})
}
function averageTrueRange(candles: CompleteCandle[], period: number) {
	if (!enough(candles, period)) return null
	return mean(tail(trueRanges(candles), period))
}
function std(values: number[]) {
	const average = mean(values)
	return average == null ? null : Math.sqrt(mean(values.map(value => (value - average) ** 2)) ?? 0)
}
function dateOf(candle: CompleteCandle, index: number) {
	return candle.timestamp == null ? String(index) : new Date(candle.timestamp).toISOString().slice(0, 10)
}

export function sma(candles: CompleteCandle[], period = 20) {
	const value = smaValues(closes(candles), period)
	return value == null ? null : result(round(value), 'SMA_n = (1/n) × Σ Close_i', { period })
}
export function ema(candles: CompleteCandle[], period = 20) {
	const value = emaValues(closes(candles), period)
	return value == null ? null : result(round(value), 'EMA_t = α×Close_t + (1−α)×EMA_(t−1), α=2/(n+1)', { period })
}
export function wma(candles: CompleteCandle[], period = 20) {
	const value = wmaValues(closes(candles), period)
	return value == null ? null : result(round(value), 'WMA_n = Σ(i×Close_i) / Σi', { period })
}
export function vwma(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period)
	const denominator = sum(volumes(window))
	if (denominator <= 0) return null
	return result(round(sum(window.map(candle => close(candle) * volume(candle))) / denominator), 'VWMA_n = Σ(Close_i×Volume_i) / ΣVolume_i', { period })
}
export function hma(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const half = Math.max(1, Math.floor(period / 2))
	const root = Math.max(1, Math.floor(Math.sqrt(period)))
	const values = closes(candles)
	const raw = values.map((_, index) => {
		const first = wmaValues(values.slice(0, index + 1), half)
		const second = wmaValues(values.slice(0, index + 1), period)
		return first == null || second == null ? null : 2 * first - second
	}).filter((value): value is number => value != null)
	const value = wmaValues(raw, root)
	return value == null ? null : result(round(value), 'HMA_n = WMA_(√n)(2×WMA_(n/2)−WMA_n)', { period, half, root })
}
export function superTrend(candles: CompleteCandle[], period = 10, multiplier = 3) {
	const atr = averageTrueRange(candles, period)
	const latest = candles.at(-1)
	if (atr == null || latest == null) return null
	const basis = (high(latest) + low(latest)) / 2
	const upper = basis + multiplier * atr
	const lower = basis - multiplier * atr
	const trend = close(latest) >= basis ? 'up' : 'down'
	return result({ value: round(trend === 'up' ? lower : upper), trend, upper: round(upper), lower: round(lower) }, 'Basic bands=(H+L)/2 ± multiplier×ATR; SuperTrend follows close-side band', { period, multiplier }, trend === 'up' ? 'BUY' : 'SELL', 'moderate')
}
export function parabolicSar(candles: CompleteCandle[], step = 0.02, maximum = 0.2) {
	if (candles.length < 2) return null
	let rising = close(candles[1]) >= close(candles[0])
	let sar = rising ? low(candles[0]) : high(candles[0])
	let extreme = rising ? high(candles[0]) : low(candles[0])
	let acceleration = step
	for (const candle of candles.slice(1)) {
		sar += acceleration * (extreme - sar)
		if (rising) {
			if (low(candle) < sar) { rising = false; sar = extreme; extreme = low(candle); acceleration = step }
			else if (high(candle) > extreme) { extreme = high(candle); acceleration = Math.min(maximum, acceleration + step) }
		} else if (high(candle) > sar) { rising = true; sar = extreme; extreme = high(candle); acceleration = step }
		else if (low(candle) < extreme) { extreme = low(candle); acceleration = Math.min(maximum, acceleration + step) }
	}
	return result(round(sar), 'SAR_t = SAR_(t−1)+AF×(EP−SAR_(t−1))', { step, maximum }, close(candles.at(-1)!) >= sar ? 'BUY' : 'SELL', 'moderate')
}
export function ichimoku(candles: CompleteCandle[], conversionPeriod = 9, basePeriod = 26, spanPeriod = 52, displacement = 26) {
	if (!enough(candles, spanPeriod)) return null
	const midpoint = (period: number) => ((max(tail(highs(candles), period)) ?? 0) + (min(tail(lows(candles), period)) ?? 0)) / 2
	const tenkan = midpoint(conversionPeriod)
	const kijun = midpoint(basePeriod)
	const spanA = (tenkan + kijun) / 2
	const spanB = midpoint(spanPeriod)
	const lastClose = close(candles.at(-1)!)
	const signal = lastClose > Math.max(spanA, spanB) && tenkan > kijun ? 'BUY' : lastClose < Math.min(spanA, spanB) && tenkan < kijun ? 'SELL' : 'NEUTRAL'
	return result({ tenkan: round(tenkan), kijun: round(kijun), senkouA: round(spanA), senkouB: round(spanB), chikou: round(lastClose), displacement }, 'Tenkan=(H9+L9)/2; Kijun=(H26+L26)/2; SenkouA=(Tenkan+Kijun)/2; SenkouB=(H52+L52)/2', { conversionPeriod, basePeriod, spanPeriod, displacement }, signal, 'moderate')
}
export function rsi(candles: CompleteCandle[], period = 14) {
	const values = closes(candles)
	if (values.length <= period) return null
	let gains = 0, losses = 0
	for (let i = 1; i <= period; i++) { const change = values[i] - values[i - 1]; gains += Math.max(change, 0); losses += Math.max(-change, 0) }
	let averageGain = gains / period, averageLoss = losses / period
	for (let i = period + 1; i < values.length; i++) { const change = values[i] - values[i - 1]; averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period; averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period }
	const value = averageLoss < EPS ? 100 : 100 - 100 / (1 + averageGain / averageLoss)
	return directional(value, 70, 30, 'RSI = 100 − 100/(1 + WilderAverageGain/WilderAverageLoss)', { period })
}
export function stochastic(candles: CompleteCandle[], period = 14, signalPeriod = 3) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), highest = max(highs(window))!, lowest = min(lows(window))!
	if (highest === lowest) return null
	const k = ((close(window.at(-1)!) - lowest) / (highest - lowest)) * 100
	return directional(k, 80, 20, '%K = 100×(Close−LowestLow_n)/(HighestHigh_n−LowestLow_n)', { period, signalPeriod })
}
export function stochRsi(candles: CompleteCandle[], period = 14, stochasticPeriod = 14) {
	if (candles.length < period + stochasticPeriod) return null
	const values: number[] = []
	for (let i = period; i < candles.length; i++) { const current = rsi(candles.slice(0, i + 1), period)?.value as number; values.push(current) }
	const window = tail(values, stochasticPeriod), lowest = min(window)!, highest = max(window)!
	const value = highest === lowest ? 50 : ((values.at(-1)! - lowest) / (highest - lowest)) * 100
	return directional(value, 80, 20, 'StochRSI = (RSI−LowestRSI_n)/(HighestRSI_n−LowestRSI_n)', { period, stochasticPeriod })
}
export function macd(candles: CompleteCandle[], fast = 12, slow = 26, signalPeriod = 9) {
	const values = closes(candles), fastEma = emaValues(values, fast), slowEma = emaValues(values, slow)
	if (fastEma == null || slowEma == null) return null
	const line = fastEma - slowEma
	const history: number[] = []
	for (let i = slow; i <= values.length; i++) { const f = emaValues(values.slice(0, i), fast), s = emaValues(values.slice(0, i), slow); if (f != null && s != null) history.push(f - s) }
	const signalLine = emaValues(history, signalPeriod) ?? line
	return result({ macd: round(line), signal: round(signalLine), histogram: round(line - signalLine) }, 'MACD=EMA_fast−EMA_slow; Signal=EMA_signal(MACD); Histogram=MACD−Signal', { fast, slow, signalPeriod }, line >= signalLine ? 'BUY' : 'SELL', Math.abs(line - signalLine) > Math.abs(signalLine) * 0.25 ? 'strong' : 'moderate')
}
export function cci(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const typical = tail(candles, period).map(c => (high(c) + low(c) + close(c)) / 3), average = mean(typical)!, deviation = mean(typical.map(value => Math.abs(value - average)))!
	const value = deviation < EPS ? 0 : (typical.at(-1)! - average) / (0.015 * deviation)
	return directional(value, 100, -100, 'CCI=(TypicalPrice−SMA(TypicalPrice))/(0.015×MeanDeviation)', { period })
}
export function williamsR(candles: CompleteCandle[], period = 14) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), highest = max(highs(window))!, lowest = min(lows(window))!
	const value = highest === lowest ? -50 : ((highest - close(window.at(-1)!)) / (highest - lowest)) * -100
	return directional(value, -20, -80, '%R = −100×(HighestHigh−Close)/(HighestHigh−LowestLow)', { period })
}
export function roc(candles: CompleteCandle[], period = 12) {
	if (candles.length <= period) return null
	const value = ((close(candles.at(-1)!) - close(candles.at(-1 - period)!)) / close(candles.at(-1 - period)!)) * 100
	return directional(value, 0, 0, 'ROC_n = 100×(Close_t−Close_(t−n))/Close_(t−n)', { period })
}
export function momentum(candles: CompleteCandle[], period = 10) {
	if (candles.length <= period) return null
	const value = close(candles.at(-1)!) - close(candles.at(-1 - period)!)
	return result(round(value), 'Momentum_n = Close_t−Close_(t−n)', { period }, value > 0 ? 'BUY' : value < 0 ? 'SELL' : 'NEUTRAL', Math.abs(value) > Math.abs(close(candles.at(-1)!)) * 0.03 ? 'strong' : 'moderate')
}
export function tsi(candles: CompleteCandle[], longPeriod = 25, shortPeriod = 13) {
	const values = closes(candles), changes = values.slice(1).map((value, i) => value - values[i]), absChanges = changes.map(Math.abs)
	const first = emaValues(changes, longPeriod), firstAbs = emaValues(absChanges, longPeriod)
	if (first == null || firstAbs == null) return null
	const value = (emaValues(changes.map((_, i) => emaValues(changes.slice(0, i + 1), longPeriod) ?? 0), shortPeriod) ?? first) / Math.max(emaValues(absChanges.map((_, i) => emaValues(absChanges.slice(0, i + 1), longPeriod) ?? 0), shortPeriod) ?? firstAbs, EPS) * 100
	return directional(value, 25, -25, 'TSI=100×EMA_short(EMA_long(momentum))/EMA_short(EMA_long(|momentum|))', { longPeriod, shortPeriod })
}
export function rvi(candles: CompleteCandle[], period = 10) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), numerator = sum(window.map(c => close(c) - (c.open ?? close(c)))), denominator = sum(window.map(c => high(c) - low(c)))
	const value = denominator < EPS ? 0 : numerator / denominator
	return directional(value, 0.1, -0.1, 'RVI=Σ(Close−Open)/Σ(High−Low)', { period })
}
export function atr(candles: CompleteCandle[], period = 14) {
	const value = averageTrueRange(candles, period)
	return value == null ? null : result(round(value), 'ATR_n = WilderAverage(TrueRange_n)', { period })
}
export function bollingerBands(candles: CompleteCandle[], period = 20, multiplier = 2) {
	if (!enough(candles, period)) return null
	const window = tail(closes(candles), period), middle = mean(window)!, deviation = std(window)!, upper = middle + multiplier * deviation, lower = middle - multiplier * deviation, latest = window.at(-1)!
	return result({ upper: round(upper), middle: round(middle), lower: round(lower), bandwidth: round((upper - lower) / Math.max(Math.abs(middle), EPS)) }, 'Middle=SMA_n; Upper/Lower=Middle±k×σ_n', { period, multiplier }, latest > upper ? 'SELL' : latest < lower ? 'BUY' : 'NEUTRAL', latest > upper || latest < lower ? 'strong' : 'weak')
}
export function keltnerChannels(candles: CompleteCandle[], period = 20, atrPeriod = 10, multiplier = 2) {
	const middle = emaValues(closes(candles), period), range = averageTrueRange(candles, atrPeriod)
	if (middle == null || range == null) return null
	const upper = middle + multiplier * range, lower = middle - multiplier * range, latest = close(candles.at(-1)!)
	return result({ upper: round(upper), middle: round(middle), lower: round(lower), atr: round(range) }, 'Middle=EMA_n; Upper/Lower=Middle±k×ATR', { period, atrPeriod, multiplier }, latest > upper ? 'BUY' : latest < lower ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function donchianChannels(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), upperValue = max(highs(window)), lowerValue = min(lows(window))
	if (upperValue == null || lowerValue == null) return null
	const upper = upperValue, lower = lowerValue, middle = (upper + lower) / 2, latest = close(candles.at(-1)!)
	return result({ upper: round(upper), middle: round(middle), lower: round(lower) }, 'Upper=HighestHigh_n; Lower=LowestLow_n; Middle=(Upper+Lower)/2', { period }, latest >= upper ? 'BUY' : latest <= lower ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function standardDeviation(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const value = std(tail(closes(candles), period))!
	return result(round(value), 'σ=√(Σ(Close−SMA)^2/n)', { period })
}
export function historicalVolatility(candles: CompleteCandle[], period = 20, annualization = 252) {
	const values = closes(candles)
	if (values.length <= period) return null
	const returns = values.slice(1).map((value, i) => Math.log(value / values[i]))
	const deviation = std(tail(returns, period))!
	return result(round(deviation * Math.sqrt(annualization) * 100), 'HV=StdDev(log returns)×√annualization×100', { period, annualization })
}
export function chaikinVolatility(candles: CompleteCandle[], period = 10, rocPeriod = 10) {
	const ranges = candles.map(c => high(c) - low(c)), current = emaValues(ranges, period)
	if (current == null || ranges.length <= period + rocPeriod) return null
	const prior = emaValues(ranges.slice(0, -rocPeriod), period)
	if (prior == null || prior === 0) return null
	const value = ((current - prior) / prior) * 100
	return directional(value, 20, -20, 'ChaikinVol=100×(EMA(range)_t−EMA(range)_(t−r))/EMA(range)_(t−r)', { period, rocPeriod })
}
export function obv(candles: CompleteCandle[]) {
	if (candles.length < 2) return null
	let value = 0
	for (let i = 1; i < candles.length; i++) value += close(candles[i]) > close(candles[i - 1]) ? volume(candles[i]) : close(candles[i]) < close(candles[i - 1]) ? -volume(candles[i]) : 0
	return result(round(value), 'OBV_t=OBV_(t−1)+Volume if Close rises; −Volume if Close falls', {}, value > 0 ? 'BUY' : value < 0 ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function volumeProfile(candles: CompleteCandle[], bins = 24, valueArea = 0.7) {
	if (!candles.length || bins < 2) return null
	const lowest = min(lows(candles))!, highest = max(highs(candles))!, width = (highest - lowest) / bins
	if (width <= EPS) return null
	const profile = Array.from({ length: bins }, () => 0)
	for (const candle of candles) { const index = Math.min(bins - 1, Math.max(0, Math.floor((close(candle) - lowest) / width))); profile[index] += volume(candle) }
	const pocIndex = profile.indexOf(Math.max(...profile)), total = sum(profile), target = total * valueArea
	let left = pocIndex, right = pocIndex, covered = profile[pocIndex]
	while (covered < target && (left > 0 || right < bins - 1)) { const nextLeft = left > 0 ? profile[left - 1] : -1, nextRight = right < bins - 1 ? profile[right + 1] : -1; if (nextLeft >= nextRight && left > 0) { left--; covered += profile[left] } else if (right < bins - 1) { right++; covered += profile[right] } else break }
	return result({ poc: round(lowest + (pocIndex + 0.5) * width), vah: round(lowest + (right + 1) * width), val: round(lowest + left * width), bins, totalVolume: round(total) }, 'POC=price bin with maximum volume; VAH/VAL enclose configured value area', { bins, valueArea })
}
export function accumulationDistribution(candles: CompleteCandle[]) {
	if (!candles.length) return null
	let value = 0
	for (const candle of candles) { const range = high(candle) - low(candle); value += range < EPS ? 0 : (((close(candle) - low(candle)) - (high(candle) - close(candle))) / range) * volume(candle) }
	return result(round(value), 'AD=Σ(((Close−Low)−(High−Close))/(High−Low))×Volume', {}, value > 0 ? 'BUY' : value < 0 ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function chaikinMoneyFlow(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), moneyFlow = window.map(c => { const range = high(c) - low(c); return range < EPS ? 0 : (((close(c) - low(c)) - (high(c) - close(c))) / range) * volume(c) })
	const value = sum(volumes(window)) < EPS ? 0 : sum(moneyFlow) / sum(volumes(window))
	return directional(value, 0.05, -0.05, 'CMF=Σ(MoneyFlowMultiplier×Volume)/ΣVolume', { period })
}
export function moneyFlowIndex(candles: CompleteCandle[], period = 14) {
	if (candles.length <= period) return null
	const typical = candles.map(c => (high(c) + low(c) + close(c)) / 3), positive: number[] = [], negative: number[] = []
	for (let i = 1; i < typical.length; i++) { const flow = typical[i] * volume(candles[i]); if (typical[i] >= typical[i - 1]) positive.push(flow); else negative.push(flow) }
	const positiveFlow = sum(tail(positive, period)), negativeFlow = sum(tail(negative, period)), value = negativeFlow < EPS ? 100 : 100 - 100 / (1 + positiveFlow / negativeFlow)
	return directional(value, 80, 20, 'MFI=100−100/(1+PositiveMoneyFlow/NegativeMoneyFlow)', { period })
}
export function vwap(candles: CompleteCandle[], period = candles.length) {
	if (!candles.length) return null
	const window = tail(candles, period), denominator = sum(volumes(window))
	if (denominator <= 0) return null
	const value = sum(window.map(c => ((high(c) + low(c) + close(c)) / 3) * volume(c))) / denominator
	return result(round(value), 'VWAP=Σ(TypicalPrice×Volume)/ΣVolume', { period }, close(candles.at(-1)!) >= value ? 'BUY' : 'SELL', 'moderate')
}
export function volumeOscillator(candles: CompleteCandle[], fastPeriod = 5, slowPeriod = 20) {
	const values = volumes(candles), fast = emaValues(values, fastPeriod), slow = emaValues(values, slowPeriod)
	if (fast == null || slow == null || slow === 0) return null
	const value = ((fast - slow) / slow) * 100
	return directional(value, 0, 0, 'VO=100×(EMA_fast(Volume)−EMA_slow(Volume))/EMA_slow(Volume)', { fastPeriod, slowPeriod })
}
export function adx(candles: CompleteCandle[], period = 14) {
	const dmiResult = dmi(candles, period)
	if (dmiResult == null) return null
	return result(dmiResult.value.adx, 'ADX=100×EMA(|+DI−−DI|/(+DI+−DI))', { period }, dmiResult.value.adx >= 25 ? (dmiResult.value.plusDi >= dmiResult.value.minusDi ? 'BUY' : 'SELL') : 'NEUTRAL', dmiResult.value.adx >= 40 ? 'strong' : dmiResult.value.adx >= 25 ? 'moderate' : 'weak')
}
export function dmi(candles: CompleteCandle[], period = 14) {
	if (candles.length <= period) return null
	const tr = trueRanges(candles), plus: number[] = [], minus: number[] = []
	for (let i = 1; i < candles.length; i++) { const up = high(candles[i]) - high(candles[i - 1]), down = low(candles[i - 1]) - low(candles[i]); plus.push(up > down && up > 0 ? up : 0); minus.push(down > up && down > 0 ? down : 0) }
	const trSum = sum(tail(tr, period)), plusDi = trSum < EPS ? 0 : (sum(tail(plus, period)) / trSum) * 100, minusDi = trSum < EPS ? 0 : (sum(tail(minus, period)) / trSum) * 100, dx = ((Math.abs(plusDi - minusDi) / Math.max(plusDi + minusDi, EPS)) * 100)
	return result({ plusDi: round(plusDi), minusDi: round(minusDi), adx: round(dx) }, 'TR=ΣTrueRange; +DI=100×Σ+DM/TR; −DI=100×Σ−DM/TR; ADX=100×|+DI−−DI|/(+DI+−DI)', { period }, plusDi > minusDi ? 'BUY' : minusDi > plusDi ? 'SELL' : 'NEUTRAL', dx >= 40 ? 'strong' : dx >= 25 ? 'moderate' : 'weak')
}
export function aroon(candles: CompleteCandle[], period = 25) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), highIndex = window.map(high).lastIndexOf(max(window.map(high))!), lowIndex = window.map(low).lastIndexOf(min(window.map(low))!), up = ((period - 1 - (period - 1 - highIndex)) / (period - 1)) * 100, down = ((period - 1 - (period - 1 - lowIndex)) / (period - 1)) * 100
	return result({ up: round(up), down: round(down), oscillator: round(up - down) }, 'AroonUp=100×(n−periodsSinceHighest)/n; AroonDown=100×(n−periodsSinceLowest)/n', { period }, up > down ? 'BUY' : down > up ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function elderRay(candles: CompleteCandle[], period = 13) {
	const average = emaValues(closes(candles), period), latest = candles.at(-1)
	if (average == null || latest == null) return null
	const bull = high(latest) - average, bear = low(latest) - average
	return result({ bullPower: round(bull), bearPower: round(bear), ema: round(average) }, 'BullPower=High−EMA; BearPower=Low−EMA', { period }, bull > 0 && bear > 0 ? 'BUY' : bull < 0 && bear < 0 ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function vortex(candles: CompleteCandle[], period = 14) {
	if (candles.length <= period) return null
	let positive = 0, negative = 0
	for (const [index, candle] of candles.slice(-period).entries()) { const actualIndex = candles.length - period + index; const previous = candles[actualIndex - 1]; if (!previous) continue; positive += Math.abs(high(candle) - low(previous)); negative += Math.abs(low(candle) - high(previous)) }
	const tr = sum(tail(trueRanges(candles), period)), plus = tr < EPS ? 0 : positive / tr, minus = tr < EPS ? 0 : negative / tr
	return result({ plus: round(plus), minus: round(minus) }, 'VI+=Σ|High_t−Low_(t−1)|/ΣTR; VI−=Σ|Low_t−High_(t−1)|/ΣTR', { period }, plus > minus ? 'BUY' : minus > plus ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function fisherTransform(candles: CompleteCandle[], period = 10) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), midpoint = (high(window.at(-1)!) + low(window.at(-1)!)) / 2, highest = max(window.map(high))!, lowest = min(window.map(low))!, normalized = Math.max(-0.999, Math.min(0.999, 2 * ((midpoint - lowest) / Math.max(highest - lowest, EPS) - 0.5))), value = 0.5 * Math.log((1 + normalized) / (1 - normalized))
	return result(round(value), 'Fisher=0.5×ln((1+2×normalizedPrice)/(1−2×normalizedPrice))', { period }, value > 0 ? 'BUY' : value < 0 ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function schaffTrendCycle(candles: CompleteCandle[], fast = 23, slow = 50, cycle = 10) {
	const line = macd(candles, fast, slow, cycle)
	if (line == null) return null
	const value = Math.max(0, Math.min(100, 50 + line.value.histogram / Math.max(Math.abs(line.value.macd), EPS) * 50))
	return directional(value, 75, 25, 'STC=stochastic transform of MACD over cycle length', { fast, slow, cycle })
}
export function coppockCurve(candles: CompleteCandle[], longPeriod = 14, shortPeriod = 11, wmaPeriod = 10) {
	if (candles.length <= Math.max(longPeriod, shortPeriod) + wmaPeriod) return null
	const values = closes(candles), rocLong: number[] = [], rocShort: number[] = []
	for (let i = Math.max(longPeriod, shortPeriod); i < values.length; i++) { rocLong.push(((values[i] - values[i - longPeriod]) / values[i - longPeriod]) * 100); rocShort.push(((values[i] - values[i - shortPeriod]) / values[i - shortPeriod]) * 100) }
	const value = wmaValues(rocLong.map((v, i) => v + rocShort[i]), wmaPeriod)
	return value == null ? null : directional(value, 0, 0, 'Coppock=WMA(ROC_long+ROC_short)', { longPeriod, shortPeriod, wmaPeriod })
}
export function kst(candles: CompleteCandle[], smaPeriod = 10) {
	if (candles.length < 60) return null
	const values = closes(candles), roc1 = values.at(-1)! / values.at(-10)! - 1, roc2 = values.at(-1)! / values.at(-15)! - 1, roc3 = values.at(-1)! / values.at(-20)! - 1, roc4 = values.at(-1)! / values.at(-30)! - 1, value = (roc1 + 2 * roc2 + 3 * roc3 + 4 * roc4) * 100
	return directional(value, 0, 0, 'KST=MA(ROC10)+2×MA(ROC15)+3×MA(ROC20)+4×MA(ROC30)', { smaPeriod })
}
export function relativeStrength(candles: CompleteCandle[], benchmark: CompleteCandle[], period = 20) {
	if (!enough(candles, period) || !enough(benchmark, period)) return null
	const assetReturn = close(candles.at(-1)!) / close(candles.at(-1 - period)!) - 1, benchmarkReturn = close(benchmark.at(-1)!) / close(benchmark.at(-1 - period)!) - 1, value = (assetReturn - benchmarkReturn) * 100
	return directional(value, 0, 0, 'RelativeStrength=(AssetReturn−BenchmarkReturn)×100', { period })
}

export function trueRange(candles: CompleteCandle[]) {
	const value = candles.length ? trueRanges(candles).at(-1)! : null
	return value == null ? null : result(round(value), 'TR=max(High−Low, |High−PreviousClose|, |Low−PreviousClose|)', {})
}
export function typicalPrice(candles: CompleteCandle[]) {
	const candle = candles.at(-1)
	return candle == null ? null : result(round((high(candle) + low(candle) + close(candle)) / 3), 'TypicalPrice=(High+Low+Close)/3', {})
}
export function priceChange(candles: CompleteCandle[], period = 1) {
	if (candles.length <= period) return null
	const value = ((close(candles.at(-1)!) - close(candles.at(-1 - period)!)) / close(candles.at(-1 - period)!)) * 100
	return directional(value, 0, 0, 'PriceChange=100×(Close_t−Close_(t−n))/Close_(t−n)', { period })
}
export function percentB(candles: CompleteCandle[], period = 20, multiplier = 2) {
	const bands = bollingerBands(candles, period, multiplier), latest = candles.at(-1)
	if (bands == null || latest == null || bands.value.upper === bands.value.lower) return null
	const value = (close(latest) - bands.value.lower) / (bands.value.upper - bands.value.lower)
	return directional(value, 1, 0, '%B=(Close−LowerBand)/(UpperBand−LowerBand)', { period, multiplier })
}
export function bandWidth(candles: CompleteCandle[], period = 20, multiplier = 2) {
	const bands = bollingerBands(candles, period, multiplier)
	return bands == null ? null : result(round(bands.value.bandwidth), 'Bandwidth=(UpperBand−LowerBand)/MiddleBand', { period, multiplier })
}
export function averageVolume(candles: CompleteCandle[], period = 20) {
	if (!enough(candles, period)) return null
	return result(round(mean(tail(volumes(candles), period))!), 'AverageVolume=ΣVolume/n', { period })
}
export function relativeVolume(candles: CompleteCandle[], period = 20) {
	const average = averageVolume(candles, period), latest = candles.at(-1)
	if (average == null || latest == null || average.value === 0) return null
	const value = volume(latest) / average.value
	return directional(value, 1.2, 0.8, 'RelativeVolume=CurrentVolume/AverageVolume_n', { period })
}
export function pivotPoints(candles: CompleteCandle[]) {
	const candle = candles.at(-1)
	if (candle == null) return null
	const pivot = (high(candle) + low(candle) + close(candle)) / 3
	const r1 = 2 * pivot - low(candle), s1 = 2 * pivot - high(candle), r2 = pivot + high(candle) - low(candle), s2 = pivot - high(candle) + low(candle)
	return result({ pivot: round(pivot), r1: round(r1), r2: round(r2), s1: round(s1), s2: round(s2) }, 'P=(H+L+C)/3; R1=2P−L; S1=2P−H; R2=P+H−L; S2=P−H+L', {}, close(candle) > pivot ? 'BUY' : close(candle) < pivot ? 'SELL' : 'NEUTRAL', 'moderate')
}
export function fibonacciPosition(candles: CompleteCandle[], period = 100) {
	if (!enough(candles, period)) return null
	const window = tail(candles, period), highest = max(window.map(high))!, lowest = min(window.map(low))!, range = highest - lowest
	if (range <= EPS) return null
	const value = (close(candles.at(-1)!) - lowest) / range
	return directional(value, 0.618, 0.382, 'FibonacciPosition=(Close−SwingLow)/(SwingHigh−SwingLow)', { period })
}

export function completeIndicatorLibrary(candles: CompleteCandle[], benchmark: CompleteCandle[] = []) {
	return {
		trend: { sma: sma(candles), ema: ema(candles), wma: wma(candles), vwma: vwma(candles), hma: hma(candles), superTrend: superTrend(candles), parabolicSar: parabolicSar(candles), ichimoku: ichimoku(candles) },
		momentum: { rsi: rsi(candles), stochastic: stochastic(candles), stochRsi: stochRsi(candles), macd: macd(candles), cci: cci(candles), williamsR: williamsR(candles), roc: roc(candles), momentum: momentum(candles), tsi: tsi(candles), rvi: rvi(candles) },
		volatility: { atr: atr(candles), bollingerBands: bollingerBands(candles), keltnerChannels: keltnerChannels(candles), donchianChannels: donchianChannels(candles), standardDeviation: standardDeviation(candles), historicalVolatility: historicalVolatility(candles), chaikinVolatility: chaikinVolatility(candles) },
		volume: { obv: obv(candles), volumeProfile: volumeProfile(candles), accumulationDistribution: accumulationDistribution(candles), chaikinMoneyFlow: chaikinMoneyFlow(candles), moneyFlowIndex: moneyFlowIndex(candles), vwap: vwap(candles), volumeOscillator: volumeOscillator(candles) },
		strength: { adx: adx(candles), dmi: dmi(candles), aroon: aroon(candles), elderRay: elderRay(candles), vortex: vortex(candles) },
		advanced: { fisherTransform: fisherTransform(candles), schaffTrendCycle: schaffTrendCycle(candles), coppockCurve: coppockCurve(candles), kst: kst(candles), relativeStrength: benchmark.length ? relativeStrength(candles, benchmark) : null, percentB: percentB(candles), bandWidth: bandWidth(candles), fibonacciPosition: fibonacciPosition(candles) },
	}
}

export const indicatorNames = ['SMA', 'EMA', 'WMA', 'VWMA', 'HMA', 'SuperTrend', 'Parabolic SAR', 'Ichimoku', 'RSI', 'Stochastic', 'StochRSI', 'MACD', 'CCI', 'Williams %R', 'ROC', 'Momentum', 'TSI', 'RVI', 'ATR', 'Bollinger Bands', 'Keltner Channels', 'Donchian Channels', 'Standard Deviation', 'Historical Volatility', 'Chaikin Volatility', 'OBV', 'Volume Profile', 'Accumulation/Distribution', 'Chaikin Money Flow', 'MFI', 'VWAP', 'Volume Oscillator', 'ADX', 'DMI', 'Aroon', 'Elder Ray', 'Vortex', 'Fisher Transform', 'Schaff Trend Cycle', 'Coppock Curve', 'KST', 'Relative Strength', 'True Range', 'Typical Price', 'Price Change', 'Percent B', 'Band Width', 'Average Volume', 'Relative Volume', 'Pivot Points', 'Fibonacci Position'] as const
export const indicatorCount = indicatorNames.length

export function indicatorMetadata() {
	return { count: indicatorCount, names: indicatorNames, disclaimer: 'المؤشرات وصف كمي لحركة السعر والحجم وليست توصية استثمارية.' }
}

export function candleDate(candle: CompleteCandle, index: number) {
	return dateOf(candle, index)
}
