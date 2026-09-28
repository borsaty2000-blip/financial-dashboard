import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeSupportResistance, supportResistanceMetadata, type SRExtendedCandle } from '../src/services/analysis/support-resistance.service.js'

function candle(index: number, close: number, volume = 1000, timestamp?: string): SRExtendedCandle { return { open: close - 0.3, high: close + 1, low: close - 1, close, volume, timestamp: timestamp ?? `2026-09-${String((index % 28) + 1).padStart(2, '0')}` } }
function wave(count = 80): SRExtendedCandle[] { return Array.from({ length: count }, (_, index) => { const value = 100 + Math.sin(index / 3) * 12 + Math.sin(index / 11) * 4; return candle(index, value, 1000 + (index % 5) * 100) }) }
function flat(count = 40, price = 100) { return Array.from({ length: count }, (_, index) => candle(index, price)) }
function rising(count = 60) { return Array.from({ length: count }, (_, index) => candle(index, 80 + index * 0.8, 1000)) }
function levelNames(result: ReturnType<typeof analyzeSupportResistance>) { return result.levels.flatMap(level => level.sources) }

test('metadata exposes the nine requested source groups', () => assert.equal(supportResistanceMetadata.sources.length, 9))
test('metadata declares the minimum candle count', () => assert.equal(supportResistanceMetadata.minimumCandles, 30))
test('insufficient data returns unavailable without levels', () => { const result = analyzeSupportResistance(flat(29)); assert.equal(result.available, false); assert.equal(result.levels.length, 0); assert.ok(result.data_quality.warnings.length > 0) })
test('sufficient data returns an available contract', () => assert.equal(analyzeSupportResistance(wave()).available, true))
test('result always contains nearest level fields', () => { const result = analyzeSupportResistance(wave()); assert.ok('nearest_resistance' in result); assert.ok('nearest_support' in result) })
test('swing levels are detected from repeated extrema', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('swing_high') || names.includes('swing_low')) })
test('swing lookbacks are represented by consolidated source evidence', () => { const result = analyzeSupportResistance(wave()); assert.ok(result.levels.some(level => level.sources.includes('swing_high') || level.sources.includes('swing_low'))) })
test('volume profile POC is available with positive volume', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('volume_profile_poc')) })
test('volume profile value area sources are available', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('volume_profile_vah') || names.includes('volume_profile_val')) })
test('Fibonacci levels are generated from the recent swing range', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.some(name => name.startsWith('fibonacci_'))) })
test('all five Fibonacci ratios are supported by the contract', () => { const result = analyzeSupportResistance(wave()); const names = levelNames(result); for (const name of ['fibonacci_23.6', 'fibonacci_38.2', 'fibonacci_50', 'fibonacci_61.8', 'fibonacci_78.6']) assert.ok(names.includes(name as never)) })
test('Gann angle sources are generated', () => { const names = levelNames(analyzeSupportResistance(rising())); assert.ok(names.includes('gann_1x1') || names.includes('gann_2x1') || names.includes('gann_1x2')) })
test('psychological levels are generated around current price', () => assert.ok(levelNames(analyzeSupportResistance(wave())).includes('psychological')))
test('previous day levels are sourced from the preceding segment', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('pdh') || names.includes('pdl')) })
test('previous week levels are sourced from the preceding five bars', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('pwh') || names.includes('pwl')) })
test('previous month levels are sourced from the preceding twenty bars', () => { const names = levelNames(analyzeSupportResistance(wave())); assert.ok(names.includes('pmh') || names.includes('pml')) })
test('gaps are detected only when an open differs materially from prior close', () => { const values = wave(); values[40] = { ...values[40], open: values[39].close * 1.03, close: values[39].close * 1.03 }; assert.ok(levelNames(analyzeSupportResistance(values)).includes('gap')) })
test('ordinary opens do not fabricate gap sources', () => { const values = wave(); for (let i = 1; i < values.length; i++) values[i] = { ...values[i], open: values[i - 1].close }; assert.equal(levelNames(analyzeSupportResistance(values)).includes('gap'), false) })
test('nearby same-type levels are consolidated', () => { const values = wave(); const result = analyzeSupportResistance(values); for (const level of result.levels) assert.ok(level.sources.length >= 1); assert.equal(new Set(result.levels.map(level => `${level.type}:${level.level}`)).size, result.levels.length) })
test('weak levels below four are removed', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.strength >= 4) })
test('strength is capped at ten', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.strength <= 10) })
test('bounce and break rates stay within zero and one', () => { for (const level of analyzeSupportResistance(wave()).levels) { assert.ok(level.bounce_rate >= 0 && level.bounce_rate <= 1); assert.ok(level.break_rate >= 0 && level.break_rate <= 1) } })
test('priorities are one-based and ordered by strength', () => { const levels = analyzeSupportResistance(wave()).levels; assert.deepEqual(levels.map(level => level.priority), levels.map((_, index) => index + 1)); for (let i = 1; i < levels.length; i++) assert.ok(levels[i - 1].strength >= levels[i].strength) })
test('top lists contain at most five levels', () => { const result = analyzeSupportResistance(wave()); assert.ok(result.top_resistances.length <= 5); assert.ok(result.top_supports.length <= 5) })
test('nearest resistance is above or equal to current price', () => { const result = analyzeSupportResistance(wave()); const current = wave().at(-1)!.close; if (result.nearest_resistance) assert.ok(result.nearest_resistance.level >= current) })
test('nearest support is below or equal to current price', () => { const result = analyzeSupportResistance(wave()); const current = wave().at(-1)!.close; if (result.nearest_support) assert.ok(result.nearest_support.level <= current) })
test('distance from current is non-negative', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.distance_from_current >= 0) })
test('zone position is bounded', () => { const position = analyzeSupportResistance(wave()).zone_analysis.position_in_range; assert.ok(position >= 0 && position <= 1) })
test('zone analysis exposes range boundaries', () => { const zone = analyzeSupportResistance(wave()).zone_analysis; assert.ok(zone.range_high == null || Number.isFinite(zone.range_high)); assert.ok(zone.range_low == null || Number.isFinite(zone.range_low)) })
test('missing volume emits a conservative quality warning', () => { const result = analyzeSupportResistance(wave().map(value => ({ ...value, volume: undefined }))); assert.ok(result.data_quality.warnings.length > 0) })
test('levels expose timeframe evidence', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.timeframes.length >= 1) })
test('levels expose reaction dates', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.last_reaction.length > 0) })
test('levels expose age in non-negative days', () => { for (const level of analyzeSupportResistance(wave()).levels) assert.ok(level.age_days >= 0) })
test('flat data does not create unbounded level output', () => { const result = analyzeSupportResistance(flat()); assert.ok(result.levels.length <= 10) })
