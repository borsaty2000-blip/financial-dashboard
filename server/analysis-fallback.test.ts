import assert from 'node:assert/strict'
import test from 'node:test'
import {
	analyzeElliottFallback,
	analyzeGannFallback,
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
