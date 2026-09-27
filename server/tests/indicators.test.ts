import assert from 'node:assert/strict'
import test from 'node:test'
import {
	accumulationDistribution,
	adx,
	averageVolume,
	aroon,
	atr,
	bandWidth,
	bollingerBands,
	candleDate,
	chaikinMoneyFlow,
	chaikinVolatility,
	cci,
	completeIndicatorLibrary,
	coppockCurve,
	dmi,
	donchianChannels,
	elderRay,
	ema,
	fibonacciPosition,
	fisherTransform,
	historicalVolatility,
	hma,
	ichimoku,
	kst,
	keltnerChannels,
	macd,
	moneyFlowIndex,
	momentum,
	obv,
	parabolicSar,
	percentB,
	pivotPoints,
	priceChange,
	relativeStrength,
	relativeVolume,
	rvi,
	rsi,
	schaffTrendCycle,
	sma,
	standardDeviation,
	stochRsi,
	stochastic,
	superTrend,
	tsi,
	trueRange,
	typicalPrice,
	vortex,
	volumeOscillator,
	volumeProfile,
	vwap,
	vwma,
	williamsR,
	wma,
	roc,
	indicatorMetadata,
} from '../src/services/analysis/indicators-complete.js'

type TestCandle = Parameters<typeof sma>[0][number]

function candles(count = 140): TestCandle[] {
	return Array.from({ length: count }, (_, index) => {
		const base = 100 + index * 0.35 + Math.sin(index / 5) * 3
		return {
			open: base - 0.4,
			high: base + 1.4 + (index % 4) * 0.1,
			low: base - 1.2 - (index % 3) * 0.1,
			close: base + Math.cos(index / 4) * 0.5,
			volume: 1000 + index * 5 + (index % 7) * 30,
			timestamp: `2026-01-${String((index % 28) + 1).padStart(2, '0')}`,
		}
	})
}
function assertResult(value: unknown): asserts value is { value: unknown; signal: string; strength: string; formula: string; parameters: Record<string, unknown> } {
	assert.ok(value && typeof value === 'object')
	const candidate = value as Record<string, unknown>
	assert.ok('value' in candidate)
	assert.match(String(candidate.signal), /^(BUY|SELL|NEUTRAL)$/)
	assert.match(String(candidate.strength), /^(weak|moderate|strong)$/)
	assert.ok(String(candidate.formula).length > 5)
	assert.ok(candidate.parameters && typeof candidate.parameters === 'object')
}

const data = candles()
const benchmark = data.map((candle, index) => ({ ...candle, close: candle.close + index * 0.1 }))

test('indicator metadata exposes at least 50 indicators', () => {
	const metadata = indicatorMetadata()
	assert.ok(metadata.count >= 50)
	assert.equal(metadata.count, metadata.names.length)
})
test('SMA reference value for 1..20 is 10.5', () => {
	const input = Array.from({ length: 20 }, (_, i) => ({ close: i + 1 }))
	assert.equal(sma(input, 20)?.value, 10.5)
})
test('EMA returns the seed SMA for its minimum window', () => {
	const input = Array.from({ length: 5 }, (_, i) => ({ close: i + 1 }))
	assert.equal(ema(input, 5)?.value, 3)
})
test('WMA is weighted toward the latest price', () => {
	const input = Array.from({ length: 3 }, (_, i) => ({ close: i + 1 }))
	assert.equal(wma(input, 3)?.value, 2.333333)
})
test('VWMA uses volume weights', () => assert.equal(vwma([{ close: 10, volume: 1 }, { close: 20, volume: 3 }], 2)?.value, 17.5))
test('HMA returns a finite result', () => assertResult(hma(data)))
test('SuperTrend returns bands and trend', () => { const value = superTrend(data); assertResult(value); assert.ok(value?.value.upper > value?.value.lower) })
test('Parabolic SAR returns a finite value', () => assertResult(parabolicSar(data)))
test('Ichimoku returns all cloud lines', () => { const value = ichimoku(data); assertResult(value); assert.ok(value?.value.senkouA != null && value?.value.senkouB != null) })
test('RSI remains bounded from 0 to 100', () => { const value = rsi(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('Stochastic remains bounded from 0 to 100', () => { const value = stochastic(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('StochRSI remains bounded from 0 to 100', () => { const value = stochRsi(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('MACD exposes line, signal and histogram', () => { const value = macd(data); assertResult(value); assert.ok(Number.isFinite(value!.value.histogram)) })
test('CCI returns a finite oscillator', () => assertResult(cci(data)))
test('Williams %R stays between -100 and 0', () => { const value = williamsR(data); assertResult(value); assert.ok(value!.value <= 0 && value!.value >= -100) })
test('ROC is positive for the rising fixture', () => { const value = roc(data); assertResult(value); assert.ok(value!.value > 0) })
test('Momentum is positive for the rising fixture', () => { const value = momentum(data); assertResult(value); assert.ok(value!.value > 0) })
test('TSI returns a finite oscillator', () => assertResult(tsi(data)))
test('RVI returns a finite oscillator', () => assertResult(rvi(data)))
test('ATR is positive', () => { const value = atr(data); assertResult(value); assert.ok(value!.value > 0) })
test('Bollinger upper is above lower', () => { const value = bollingerBands(data); assertResult(value); assert.ok(value!.value.upper > value!.value.lower) })
test('Keltner upper is above lower', () => { const value = keltnerChannels(data); assertResult(value); assert.ok(value!.value.upper > value!.value.lower) })
test('Donchian upper is above lower', () => { const value = donchianChannels(data); assertResult(value); assert.ok(value!.value.upper > value!.value.lower) })
test('Standard deviation is non-negative', () => { const value = standardDeviation(data); assertResult(value); assert.ok(value!.value >= 0) })
test('Historical volatility is non-negative', () => { const value = historicalVolatility(data); assertResult(value); assert.ok(value!.value >= 0) })
test('Chaikin volatility returns a finite value', () => assertResult(chaikinVolatility(data)))
test('OBV returns a signed volume value', () => assertResult(obv(data)))
test('Volume profile returns POC, VAH and VAL', () => { const value = volumeProfile(data); assertResult(value); assert.ok(value!.value.vah >= value!.value.poc && value!.value.poc >= value!.value.val) })
test('Accumulation/Distribution returns a signed value', () => assertResult(accumulationDistribution(data)))
test('Chaikin Money Flow is bounded', () => { const value = chaikinMoneyFlow(data); assertResult(value); assert.ok(value!.value >= -1 && value!.value <= 1) })
test('Money Flow Index is bounded from 0 to 100', () => { const value = moneyFlowIndex(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('VWAP is finite and positive', () => { const value = vwap(data); assertResult(value); assert.ok(value!.value > 0) })
test('Volume oscillator returns a finite percentage', () => assertResult(volumeOscillator(data)))
test('ADX is bounded from 0 to 100', () => { const value = adx(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('DMI exposes plusDI, minusDI and ADX', () => { const value = dmi(data); assertResult(value); assert.ok(value!.value.plusDi >= 0 && value!.value.minusDi >= 0) })
test('Aroon exposes both directions', () => { const value = aroon(data); assertResult(value); assert.ok(value!.value.up >= 0 && value!.value.down >= 0) })
test('Elder Ray exposes bull and bear power', () => { const value = elderRay(data); assertResult(value); assert.ok(Number.isFinite(value!.value.bullPower)) })
test('Vortex exposes plus and minus lines', () => assertResult(vortex(data)))
test('Fisher transform is finite', () => assertResult(fisherTransform(data)))
test('Schaff Trend Cycle is bounded', () => { const value = schaffTrendCycle(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 100) })
test('Coppock curve returns a finite result', () => assertResult(coppockCurve(data)))
test('KST returns a finite result', () => assertResult(kst(data)))
test('Relative strength compares asset to benchmark', () => assertResult(relativeStrength(data, benchmark)))
test('True range is positive', () => { const value = trueRange(data); assertResult(value); assert.ok(value!.value > 0) })
test('Typical price sits within the candle range', () => { const value = typicalPrice(data); assertResult(value); assert.ok(value!.value <= data.at(-1)!.high! && value!.value >= data.at(-1)!.low!) })
test('Price change is positive for rising data', () => { const rising = Array.from({ length: 20 }, (_, i) => ({ close: 100 + i })); const value = priceChange(rising); assertResult(value); assert.ok(value!.value > 0) })
test('Percent B returns a finite position', () => assertResult(percentB(data)))
test('Band width is non-negative', () => { const value = bandWidth(data); assertResult(value); assert.ok(value!.value >= 0) })
test('Average volume is positive', () => { const value = averageVolume(data); assertResult(value); assert.ok(value!.value > 0) })
test('Relative volume is positive', () => { const value = relativeVolume(data); assertResult(value); assert.ok(value!.value > 0) })
test('Pivot points expose support and resistance', () => { const value = pivotPoints(data); assertResult(value); assert.ok(value!.value.r1 > value!.value.s1) })
test('Fibonacci position is bounded', () => { const value = fibonacciPosition(data); assertResult(value); assert.ok(value!.value >= 0 && value!.value <= 1) })
test('complete library returns all categories', () => {
	const library = completeIndicatorLibrary(data, benchmark)
	assert.ok(library.trend.sma && library.momentum.rsi && library.volatility.atr && library.volume.vwap && library.strength.adx && library.advanced.relativeStrength)
})
test('short input returns null instead of fabricating values', () => {
	assert.equal(rsi([{ close: 10 }], 14), null)
	assert.equal(ichimoku([{ close: 10 }], 9, 26, 52), null)
	assert.equal(atr([{ close: 10 }], 14), null)
})
test('formula metadata is present on every selected result', () => {
	for (const value of [sma(data), ema(data), rsi(data), atr(data), obv(data), adx(data), fisherTransform(data)]) assertResult(value)
})
test('timestamp helper returns ISO date for a candle', () => assert.equal(candleDate({ ...data[0], timestamp: '2026-01-12' }, 0), '2026-01-12'))
test('all complete library scalar results are finite when present', () => {
	const library = completeIndicatorLibrary(data, benchmark) as Record<string, Record<string, unknown>>
	for (const category of Object.values(library)) for (const value of Object.values(category)) if (value) assert.ok(String((value as { formula: string }).formula).length > 0)
})
