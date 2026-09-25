import assert from 'node:assert/strict'
import test from 'node:test'
import { QualityGuardian } from './src/services/market/quality-guardian.js'
import { calculateConfluence } from './src/services/analysis/confluence.service.js'

const candle = (date: string, close: number) => ({ date, open: close - 1, high: close + 1, low: close - 2, close, volume: 100 })

test('QualityGuardian removes duplicates and invalid OHLC without fabricating data', () => {
	const result = QualityGuardian.validate([
		candle('2026-01-02', 102),
		candle('2026-01-01', 101),
		candle('2026-01-01', 999),
		{ ...candle('2026-01-03', 103), high: 90 },
	])
	assert.equal(result.clean.length, 2)
	assert.equal(result.removed, 2)
	assert.ok(result.issues.some((issue) => issue.startsWith('duplicate_date:')))
	assert.ok(result.issues.some((issue) => issue.startsWith('invalid_ohlc_range:')))
	assert.equal(result.valid, false)
})

test('QualityGuardian marks missing or old timestamps as stale', () => {
	assert.equal(QualityGuardian.isStale(undefined), true)
	assert.equal(QualityGuardian.isStale(new Date().toISOString(), 24), false)
})

test('Confluence score stays bounded and exposes missing evidence', () => {
	const candles = Array.from({ length: 40 }, (_, index) => candle(`2026-01-${String(index + 1).padStart(2, '0')}`, 100 + index))
	const result = calculateConfluence({ candles, elliott: null, gann: null, indicators: null, harmonic: { status: 'insufficient_data' } })
	assert.ok(result.bullish_confluence >= 0 && result.bullish_confluence <= 100)
	assert.equal(result.bearish_confluence + result.bullish_confluence, 100)
	assert.ok(result.missing_data.includes('gann'))
})
