import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeVsa, analyzeVsaBar, vsaMetadata, type VSACandle } from '../src/services/analysis/vsa.service.js'

function c(index: number, close: number, volume: number, spread = 1): VSACandle {
	return { open: close - 0.2, high: close + spread, low: close - spread, close, volume, timestamp: `2026-09-${String((index % 28) + 1).padStart(2, '0')}` }
}
function base(count = 30): VSACandle[] {
	return Array.from({ length: count }, (_, index) => c(index, 100 + Math.sin(index / 3) * 0.5, 1000, 1))
}
function withLast(last: VSACandle, previousClose = 100) {
	const values = base()
	values[values.length - 1] = last
	values[values.length - 2] = c(values.length - 2, previousClose, 1000, 1)
	return values
}

test('VSA metadata exposes 12 patterns', () => { assert.equal(vsaMetadata.patterns.length, 12); assert.ok(vsaMetadata.minimumCandles >= 10) })
test('short input is unavailable and does not fabricate patterns', () => { const result = analyzeVsa(base(5)); assert.equal(result.available, false); assert.equal(result.patterns.length, 0); assert.equal(result.volume_character, 'insufficient_data') })
test('bar analysis returns spread ratio', () => { const result = analyzeVsaBar(base(), 20); assert.ok(result); assert.ok(Number.isFinite(result!.spread_ratio)); assert.ok(result!.spread_ratio > 0) })
test('bar analysis returns volume ratio', () => { const result = analyzeVsaBar(base(), 20); assert.ok(result); assert.equal(result!.volume_ratio, 1) })
test('close position is zero for a low close', () => { const result = analyzeVsaBar(withLast({ ...c(29, 98, 1000, 2), close: 96, open: 97 }, 100), 29); assert.ok(result); assert.equal(result!.close_position, 0) })
test('close position is one for a high close', () => { const result = analyzeVsaBar(withLast({ ...c(29, 102, 1000, 2), close: 104, open: 103 }, 100), 29); assert.ok(result); assert.equal(result!.close_position, 1) })
test('No Demand is detected on narrow low-volume up bar', () => { const values = withLast(c(29, 101, 400, 0.3), 100); const result = analyzeVsa(values); assert.ok(result.patterns.some(pattern => pattern.pattern === 'no_demand')) })
test('No Supply is detected on narrow low-volume down bar', () => { const values = withLast(c(29, 99, 400, 0.3), 100); const result = analyzeVsa(values); assert.ok(result.patterns.some(pattern => pattern.pattern === 'no_supply')) })
test('No Demand has bearish signal', () => { const values = withLast(c(29, 101, 400, 0.3), 100); const pattern = analyzeVsa(values).patterns.find(item => item.pattern === 'no_demand'); assert.equal(pattern?.signal, 'bearish') })
test('No Supply has bullish signal', () => { const values = withLast(c(29, 99, 400, 0.3), 100); const pattern = analyzeVsa(values).patterns.find(item => item.pattern === 'no_supply'); assert.equal(pattern?.signal, 'bullish') })
test('No Demand is rejected at normal volume', () => { const values = withLast(c(29, 101, 1000, 0.3), 100); assert.equal(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'no_demand'), false) })
test('No Supply is rejected at normal volume', () => { const values = withLast(c(29, 99, 1000, 0.3), 100); assert.equal(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'no_supply'), false) })
test('Stopping Volume is detected after downtrend', () => { const values = base(); for (let i = 0; i < 25; i++) values[i].close = 110 - i * 0.3; values[28] = c(28, 102, 1000, 1); values[29] = { ...c(29, 101.5, 2500, 2), open: 102.5, high: 104, low: 94 }; assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'stopping_volume')) })
test('Selling Climax requires wide high-volume new low', () => { const values = base(); for (let i = 0; i < 25; i++) values[i].close = 110 - i * 0.3; values[29] = c(29, 98, 2500, 3); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'selling_climax')) })
test('Buying Climax requires wide high-volume new high', () => { const values = base(); for (let i = 0; i < 25; i++) values[i].close = 90 + i * 0.3; values[29] = c(29, 102, 2500, 3); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'buying_climax')) })
test('Upthrust is detected with a high close-position failure', () => { const values = base(); values[29] = { ...c(29, 100, 1800, 3), close: 98, open: 99 }; assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'upthrust')) })
test('Shakeout is detected on a new low with strong close', () => { const values = base(); values[29] = { ...c(29, 101, 1800, 3), close: 102.5, low: 96, open: 98 }; assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'shakeout')) })
test('Test Bar is detected without a new extreme at very low volume', () => { const values = base(); values[29] = c(29, 100, 400, 0.8); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'test_bar')) })
test('Effort to Rise is detected on wide rising bar', () => { const values = base(); values[29] = c(29, 102, 1800, 3); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'effort_to_rise')) })
test('Effort to Fall is detected on wide falling bar', () => { const values = base(); values[29] = c(29, 98, 1800, 3); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'effort_to_fall')) })
test('Absorption is detected on narrow high-volume middle close', () => { const values = base(); values[29] = c(29, 100, 1800, 0.3); assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'absorption')) })
test('Reverse Upthrust is detected in its lower-volume form', () => { const values = base(); values[29] = { ...c(29, 101, 1400, 3), close: 102.5, low: 96, open: 98 }; assert.ok(analyzeVsa(values).patterns.some(pattern => pattern.pattern === 'reverse_upthrust')) })
test('volume rules classify very high volume above 2x', () => { const values = base(); values[29] = c(29, 102, 2200, 3); const result = analyzeVsaBar(values, 29); assert.equal(result?.volume_character, 'very_high') })
test('volume rules classify low volume between 0.5x and 0.7x', () => { const values = base(); values[29] = c(29, 102, 600, 1); const result = analyzeVsaBar(values, 29); assert.equal(result?.volume_character, 'low') })
test('spread rules classify wide spread above 1.5x', () => { const values = base(); values[29] = c(29, 102, 1000, 2); assert.equal(analyzeVsaBar(values, 29)?.spread_character, 'wide') })
test('spread rules classify narrow spread below 0.7x', () => { const values = base(); values[29] = c(29, 102, 1000, 0.5); assert.equal(analyzeVsaBar(values, 29)?.spread_character, 'narrow') })
test('buyers and sellers balance sums to 100', () => { const result = analyzeVsa(base()); assert.equal(result.supply_demand_balance.buyers + result.supply_demand_balance.sellers, 100) })
test('accumulation character follows repeated bullish patterns', () => { const values = base(); values[27] = c(27, 99, 400, 0.3); values[28] = c(28, 98, 400, 0.3); values[29] = c(29, 97, 400, 0.3); assert.equal(analyzeVsa(values).volume_character, 'accumulation') })
test('distribution character follows repeated bearish patterns', () => { const values = base(); values[27] = c(27, 101, 400, 0.3); values[28] = c(28, 102, 400, 0.3); values[29] = c(29, 103, 400, 0.3); assert.equal(analyzeVsa(values).volume_character, 'distribution') })
test('recent bars are limited by recentBars option', () => { assert.equal(analyzeVsa(base(), { recentBars: 3 }).recent_bars.length, 3) })
test('pattern strength is bounded from 0 to 1', () => { for (const pattern of analyzeVsa(withLast(c(29, 101, 400, 0.3), 100)).patterns) assert.ok(pattern.strength >= 0 && pattern.strength <= 1) })
test('alerts are generated for repeated No Supply', () => { const values = base(); values[27] = c(27, 99, 400, 0.3); values[28] = c(28, 98, 400, 0.3); values[29] = c(29, 97, 400, 0.3); assert.ok(analyzeVsa(values, { recentBars: 5 }).alerts.some(alert => alert.includes('No Supply'))) })
test('missing volume produces a quality warning', () => { const values = base().map(value => ({ ...value, volume: undefined })); const result = analyzeVsa(values); assert.ok(result.data_quality.warnings.length > 0) })
