import assert from 'node:assert/strict'
import test from 'node:test'
import {
	analyzeElliottFallback,
	analyzeCandlesticksFallback,
	analyzeGannFallback,
	anomalyFallback,
	backtestFallback,
	forecastFallback,
	statisticalFallback,
} from './src/services/analysis/analysis-fallback.ts'

const prices = Array.from(
	{ length: 40 },
	(_, index) => 100 + index * 2 + (index % 2 ? -1 : 0),
)
const dates = prices.map(
	(_, index) => `2026-01-${String(index + 1).padStart(2, '0')}`,
)

test('Elliott fallback returns an explicitly educational contract', () => {
	const result = analyzeElliottFallback(prices)
	assert.equal(result.engine, 'deterministic-node-fallback')
	assert.equal(typeof result.confidence, 'number')
	assert.match(result.disclaimer, /تعليمي/)
})

test('Gann fallback preserves dates and educational provenance', () => {
	const result = analyzeGannFallback(prices, dates)
	assert.equal(result.engine, 'deterministic-node-fallback')
	assert.equal(result.time_cycles.length, 8)
	assert.equal(result.low_index, 0)
	assert.equal(result.high_index, prices.length - 1)
})

test('candlestick fallback returns the latest price candle contract', () => {
	const result = analyzeCandlesticksFallback(
		[100, 101],
		[103, 104],
		[99, 100],
		[102, 103],
		dates.slice(0, 2),
	)
	assert.equal(result.available, true)
	assert.equal(result.latest.close, 103)
	assert.equal(result.signal, 'bullish')
	assert.match(result.disclaimer, /تعليمي/)
})

test('statistical fallback returns finite educational metrics', () => {
	const result = statisticalFallback(prices)
	assert.equal(result.available, true)
	assert.equal(result.model, 'deterministic-node-fallback')
	assert.equal(Number.isFinite(result.sharpe_ratio), true)
})

test('forecast fallback identifies the requested unavailable model', () => {
	const result = forecastFallback(prices, 5, 'LSTM')
	assert.equal(result.requested_model, 'LSTM')
	assert.equal(result.forecast.length, 5)
	assert.match(result.note, /تعذر تشغيل/)
})

test('anomaly and backtest fallbacks remain deterministic and educational', () => {
	const anomaly = anomalyFallback(
		'COMI',
		prices,
		prices.map(() => 1000),
	)
	const backtest = backtestFallback('indicators', prices, 5, 2)
	assert.equal(anomaly.available, true)
	assert.equal(backtest.available, true)
	assert.equal(backtest.strategy, 'indicators')
	assert.match(backtest.disclaimer, /تعليمي/)
})
