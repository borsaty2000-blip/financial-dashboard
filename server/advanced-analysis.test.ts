import assert from 'node:assert/strict'
import test from 'node:test'
import { buildAdvancedAnalysis } from './src/services/analysis/advanced-analysis.service.ts'

function candles(count = 260) {
	return Array.from({ length: count }, (_, index) => {
		const base = 100 + Math.sin(index / 8) * 4 + index * 0.08
		return {
			open: base - 0.4,
			high: base + 1.2,
			low: base - 1.1,
			close: base + (index % 3 === 0 ? 0.3 : -0.1),
			volume: 1000 + (index % 10) * 40,
		}
	})
}

test('advanced analysis returns evidence-first daily, weekly and monthly matrix', () => {
	const result = buildAdvancedAnalysis({
		symbol: 'COMI',
		market: 'EGX',
		candles: candles(),
		source: 'test-fixture',
	})
	const matrix = result.timeframe_matrix as Record<string, any>
	assert.equal(matrix['1d'].available, true)
	assert.equal(matrix['1w'].available, true)
	assert.equal(matrix['1M'].available, true)
	assert.equal(matrix['1h'].available, false)
	assert.equal(result.market_overview.signal != null, true)
	assert.equal(result.data_quality.warnings.length >= 3, true)
})

test('advanced analysis exposes risk levels and scenario invalidation', () => {
	const result = buildAdvancedAnalysis({
		symbol: '1010',
		market: 'TASI',
		candles: candles(),
		source: 'Yahoo Finance',
	})
	const daily = (result.timeframe_matrix as Record<string, any>)['1d']
	assert.equal(typeof daily.stop_loss.price, 'number')
	assert.equal(daily.targets.length, 3)
	assert.equal(typeof daily.scenarios.invalidation.level, 'number')
	assert.equal(result.data_quality.quality, 'delayed')
	assert.match(result.data_quality.warnings[0], /توافق|تعليمي/)
})
