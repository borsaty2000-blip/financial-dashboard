import assert from 'node:assert/strict'
import test from 'node:test'
import {
	calculateKeltnerChannels,
	calculateTrendAngle,
	type Candle,
} from './src/services/analysis/indicators.service.ts'

function risingCandles(count: number): Candle[] {
	return Array.from({ length: count }, (_, index) => {
		const close = 100 + index
		return { close, open: close - 0.5, high: close + 1, low: close - 1 }
	})
}

test('calculates Keltner channels from complete OHLC candles', () => {
	const result = calculateKeltnerChannels(risingCandles(60))
	assert.ok(result)
	assert.ok(['above', 'inside', 'below'].includes(result.position))
	assert.ok(result.upper > result.middle)
	assert.ok(result.middle > result.lower)
	assert.ok(result.atr > 0)
})

test('returns unavailable Keltner channels for close-only candles', () => {
	const result = calculateKeltnerChannels(
		Array.from({ length: 60 }, (_, index) => ({ close: 100 + index })),
	)
	assert.equal(result, null)
})

test('classifies a rising trend angle with an explicit window', () => {
	const result = calculateTrendAngle(risingCandles(40), 20)
	assert.ok(result)
	assert.equal(result.direction, 'up')
	assert.ok(result.angleDegrees > 0)
	assert.equal(result.period, 20)
})

test('returns unavailable trend angle when history is too short', () => {
	assert.equal(calculateTrendAngle(risingCandles(10), 20), null)
})
