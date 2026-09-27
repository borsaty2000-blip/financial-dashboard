import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeWyckoff, classifyWyckoffPhase, detectWyckoffEvents, wyckoffMetadata, type WyckoffCandle } from '../src/services/analysis/wyckoff.service.js'

function candle(index: number, close: number, volume: number, spread = 1, timestamp = `2026-08-${String((index % 28) + 1).padStart(2, '0')}`): WyckoffCandle {
	return { open: close - 0.2, high: close + spread, low: close - spread, close, volume, timestamp }
}
function accumulationFixture(): WyckoffCandle[] {
	const values: WyckoffCandle[] = []
	for (let i = 0; i < 40; i++) values.push(candle(i, 108 - i * 0.62, 1000))
	values.push(candle(40, 83, 1000), candle(41, 79, 3200, 2), candle(42, 84, 1100), candle(43, 90, 1800, 2), candle(44, 88, 1200), candle(45, 86, 1000), candle(46, 81, 650, 1.2), candle(47, 84, 900), candle(48, 87, 1000), candle(49, 85, 1000), candle(50, 81, 1700, 1), candle(51, 84, 1000), candle(52, 86, 1000), candle(53, 87, 1000), candle(54, 82, 1900, 7), candle(55, 80.5, 700, 1.5), candle(56, 87, 1000), candle(57, 89, 1000), candle(58, 90, 1000), candle(59, 91, 1000))
	return values
}
function distributionFixture(): WyckoffCandle[] {
	const values: WyckoffCandle[] = []
	for (let i = 0; i < 35; i++) values.push(candle(i, 80 + i * 0.95, 1000))
	for (let i = 35; i < 45; i++) values.push(candle(i, 113 + (i % 3), 1100))
	values.push(candle(45, 118, 1000), candle(46, 119, 2800, 5), candle(47, 117, 1000), candle(48, 114, 800), candle(49, 112, 800), candle(50, 110, 900), candle(51, 108, 1000), candle(52, 106, 1200), candle(53, 104, 1300), candle(54, 102, 1400), candle(55, 100, 1500), candle(56, 98, 1500), candle(57, 96, 1500), candle(58, 94, 1500), candle(59, 92, 1500))
	return values
}

const range = { high: 92, low: 78 }

test('Wyckoff metadata declares four phases and ten events', () => {
	assert.equal(wyckoffMetadata.phases.length, 4)
	assert.equal(wyckoffMetadata.events.length, 10)
	assert.ok(wyckoffMetadata.minimumCandles >= 30)
})
test('insufficient data returns null instead of a fabricated phase', () => assert.equal(analyzeWyckoff([candle(0, 100, 1000)], { rangePeriod: 45 }), null))
test('detectWyckoffEvents returns empty for insufficient data', () => assert.deepEqual(detectWyckoffEvents(Array.from({ length: 10 }, (_, i) => candle(i, 100, 1000)), range), []))
test('accumulation fixture detects Preliminary Support', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 78 }); assert.ok(events.some(item => item.event === 'PS')) })
test('accumulation fixture detects Selling Climax', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 78 }); assert.ok(events.some(item => item.event === 'SC')) })
test('accumulation fixture detects Automatic Rally', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 78 }); assert.ok(events.some(item => item.event === 'AR')) })
test('accumulation fixture detects Secondary Test', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 78 }); assert.ok(events.some(item => item.event === 'ST')) })
test('Spring requires a break below range and a fast return', () => {
	const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 79 })
	const spring = events.find(item => item.event === 'Spring')
	assert.ok(spring, `Expected Spring event; received ${events.map(item => item.event).join(',')}`)
	assert.ok(spring!.price < 80)
})
test('Spring is confirmed only when price returns above the range low', () => { const candles = accumulationFixture().map(item => ({ ...item })); candles[54] = candle(54, 76, 1900, 3); candles[55] = candle(55, 77, 700, 1); candles[56] = candle(56, 77.5, 700, 1); const events = detectWyckoffEvents(candles, { high: 92, low: 80 }, 50, 56); assert.equal(events.some(item => item.event === 'Spring'), false) })
test('Spring Test requires lower volume than the Spring impulse', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 80 }); const spring = events.find(item => item.event === 'Spring'); const testEvent = events.find(item => item.event === 'Test'); assert.ok(spring && testEvent); assert.ok(testEvent!.index > spring!.index) })
test('Distribution fixture detects Upthrust', () => { const events = detectWyckoffEvents(distributionFixture(), { high: 120, low: 96 }, 35, 59); assert.ok(events.some(item => item.event === 'UT')) })
test('Upthrust requires a fast return below the upper range', () => { const candles = distributionFixture().map(item => ({ ...item })); candles[46] = candle(46, 119, 2800, 5); candles[47] = candle(47, 121, 1000); candles[48] = candle(48, 122, 1000); const events = detectWyckoffEvents(candles, { high: 120, low: 96 }, 35, 48); assert.equal(events.some(item => item.event === 'UT'), false) })
test('classifyWyckoffPhase identifies accumulation from Spring and Test', () => { const candles = accumulationFixture(); const events = [{ event: 'Spring', date: '2026-09-01', price: 78, volume: 'high', index: 54, significance: 'high', confirmed: true }, { event: 'Test', date: '2026-09-02', price: 84, volume: 'low', index: 55, significance: 'high', confirmed: true }] as const; assert.equal(classifyWyckoffPhase(candles, [...events], { high: 92, low: 78, duration_days: 60 }), 'accumulation') })
test('classifyWyckoffPhase identifies distribution from UT and LPSY', () => { const candles = distributionFixture(); const events = [{ event: 'UT', date: '2026-09-01', price: 123, volume: 'very_high', index: 46, significance: 'high', confirmed: true }, { event: 'LPSY', date: '2026-09-02', price: 114, volume: 'low', index: 48, significance: 'medium', confirmed: true }] as const; assert.equal(classifyWyckoffPhase(candles, [...events], { high: 120, low: 96, duration_days: 60 }), 'distribution') })
test('full accumulation analysis returns a trading range and action', () => { const analysis = analyzeWyckoff(accumulationFixture(), { rangePeriod: 30 }); assert.ok(analysis); assert.equal(analysis!.data_quality.sufficient, true); assert.ok(analysis!.trading_range.high > analysis!.trading_range.low); assert.ok(['markup_soon', 'wait_for_confirmation'].includes(analysis!.expected_action)) })
test('full distribution analysis returns downside risk or confirmation wait', () => { const analysis = analyzeWyckoff(distributionFixture(), { rangePeriod: 30 }); assert.ok(analysis); assert.ok(['distribution_risk', 'markdown_soon', 'wait_for_confirmation'].includes(analysis!.expected_action)) })
test('confidence stays within the declared probability bounds', () => { for (const fixture of [accumulationFixture(), distributionFixture()]) { const analysis = analyzeWyckoff(fixture); assert.ok(analysis!.confidence >= 0 && analysis!.confidence <= 0.95) } })
test('target zone is above accumulation range', () => { const analysis = analyzeWyckoff(accumulationFixture(), { rangePeriod: 60 }); assert.ok(analysis?.target_zone); assert.ok(analysis!.target_zone!.min > analysis!.trading_range.high) })
test('event dates and prices are populated', () => { const events = detectWyckoffEvents(accumulationFixture(), { high: 92, low: 80 }); assert.ok(events.length > 0); for (const item of events) { assert.ok(item.date.length > 0); assert.ok(Number.isFinite(item.price)); assert.ok(item.volume.length > 0) } })
test('volume classification is conservative when volume is absent', () => { const candles = accumulationFixture().map(item => ({ ...item, volume: undefined })); const analysis = analyzeWyckoff(candles, { rangePeriod: 60 }); assert.ok(analysis); assert.ok(analysis!.data_quality.warnings.length > 0) })
