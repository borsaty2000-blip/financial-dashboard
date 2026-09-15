import assert from 'node:assert/strict'
import test from 'node:test'
import {
	buildSmartSummary,
	interpretElliottWave,
	interpretRSI,
} from './src/services/analysis/smartSummary.service.ts'

test('RSI above 70 is negative overbought, never positive', () => {
	assert.equal(interpretRSI(88.56)?.signal, 'negative')
	assert.equal(interpretRSI(88.56)?.weight, -2)
})

test('Elliott C is corrective bearish even when provider direction is up', () => {
	const result = interpretElliottWave('C', 'up')
	assert.equal(result.signal, 'negative')
	assert.equal(result.weight, -2)
})

test('conflicting signals produce hold instead of a positive verdict', () => {
	const result = buildSmartSummary({
		symbol: 'CCAP',
		price: 6,
		updatedAt: '2026-09-15T00:00:00.000Z',
		rsi: 88.56,
		macd: 'bullish',
		wave: 'C',
		waveDirection: 'up',
		gannDirection: 'up',
		volatility: 0.5623,
	})
	assert.equal(result.verdict.action, 'HOLD')
	assert.equal(result.counts.conflicting, true)
	assert.match(result.verdict.reason, /متعارضة/)
	assert.equal(result.keyPoints[0].sentiment, 'negative')
})
