import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeFibonacci, fibonacciMetadata, type FibonacciCandle } from '../src/services/analysis/fibonacci.service.js'

function c(index: number, close: number, volume = 1000, timestamp?: string): FibonacciCandle { return { open: close - 0.2, high: close + 1, low: close - 1, close, volume, timestamp: timestamp ?? `2026-09-${String((index % 28) + 1).padStart(2, '0')}` } }
function up(count = 60): FibonacciCandle[] { return Array.from({ length: count }, (_, i) => c(i, i < 10 ? 80 : 80 + (i - 9) * 0.6, 1000)) }
function down(count = 60): FibonacciCandle[] { return Array.from({ length: count }, (_, i) => c(i, i < 10 ? 120 : 120 - (i - 9) * 0.6, 1000)) }
function flat(count = 40): FibonacciCandle[] { return Array.from({ length: count }, (_, i) => c(i, 100)) }
function result() { return analyzeFibonacci(up()) }

test('metadata declares seven retracement ratios', () => assert.equal(fibonacciMetadata.retracementRatios.length, 7))
test('metadata declares six extension ratios', () => assert.equal(fibonacciMetadata.extensionRatios.length, 6))
test('metadata declares Fibonacci time series', () => assert.deepEqual(fibonacciMetadata.timeSeries.slice(0, 4), [1, 2, 3, 5]))
test('insufficient data returns unavailable', () => { const value = analyzeFibonacci(flat(29)); assert.equal(value.available, false); assert.equal(value.time_zones.length, 0) })
test('flat data without a five percent swing is unavailable', () => { const value = analyzeFibonacci(flat()); assert.equal(value.available, false); assert.equal(value.retracement && Object.keys(value.retracement).length, 0) })
test('upward swing is selected from low to high', () => { const value = result(); assert.equal(value.available, true); assert.equal(value.swing_reference.direction, 'up'); assert.ok(value.swing_reference.high > value.swing_reference.low) })
test('downward swing is selected from high to low', () => { const value = analyzeFibonacci(down()); assert.equal(value.available, true); assert.equal(value.swing_reference.direction, 'down') })
test('swing range equals high minus low', () => { const value = result(); assert.equal(value.swing_reference.range, Number((value.swing_reference.high - value.swing_reference.low).toFixed(2))) })
test('retracement has all requested labels', () => { const value = result(); for (const label of ['23.6%', '38.2%', '50.0%', '61.8%', '78.6%', '88.6%', '100.0%']) assert.ok(value.retracement[label]) })
test('up retracement 50 percent is midpoint', () => { const value = result(); const expected = value.swing_reference.high - value.swing_reference.range * 0.5; assert.equal(value.retracement['50.0%'].price, Number(expected.toFixed(2))) })
test('up retracement 61.8 percent uses golden ratio', () => { const value = result(); const expected = value.swing_reference.high - value.swing_reference.range * 0.618; assert.equal(value.retracement['61.8%'].price, Number(expected.toFixed(2))); assert.equal(value.retracement['61.8%'].strength, 10); assert.equal(value.retracement['61.8%'].significance, 'golden_ratio') })
test('down retracement is measured from the low upward', () => { const value = analyzeFibonacci(down()); const expected = value.swing_reference.low + value.swing_reference.range * 0.618; assert.equal(value.retracement['61.8%'].price, Number(expected.toFixed(2))) })
test('strength ranks 50 percent above 38.2 percent', () => { const value = result(); assert.ok(value.retracement['50.0%'].strength > value.retracement['38.2%'].strength) })
test('88.6 percent has conservative strength', () => assert.equal(result().retracement['88.6%'].strength, 5))
test('extensions have all six labels', () => { const value = result(); for (const label of ['127.2%', '161.8%', '200.0%', '261.8%', '361.8%', '423.6%']) assert.ok(value.extension[label]) })
test('up extension 127.2 is calculated from low plus range', () => { const value = result(); const expected = value.swing_reference.low + value.swing_reference.range * 1.272; assert.equal(value.extension['127.2%'].price, Number(expected.toFixed(2))) })
test('down extension is projected below the low', () => { const value = analyzeFibonacci(down()); assert.ok(value.extension['161.8%'].price < value.swing_reference.low) })
test('extension ratios are labeled as extended', () => { for (const item of Object.values(result().extension)) assert.equal(item.significance, 'extended') })
test('expansion uses ABCD formula', () => { const value = analyzeFibonacci(up(), { abc: { a: 80, b: 100, c: 95 } }); assert.equal(value.expansion['1'], 75); assert.equal(value.expansion['1.618'], Number((80 + (95 - 100) * 1.618).toFixed(2))) })
test('expansion exposes three ratios', () => assert.deepEqual(Object.keys(result().expansion), ['1', '1.272', '1.618']))
test('projection uses three point formula', () => { const value = analyzeFibonacci(up(), { projection: { a: 80, b: 100 } }); assert.equal(value.projection['0.618'], 92.36); assert.equal(value.projection['1'], 100); assert.equal(value.projection['1.618'], 112.36) })
test('projection keys are stable strings', () => assert.deepEqual(Object.keys(result().projection).sort(), ['0.618', '1', '1.618'].sort()))
test('time zones include short Fibonacci intervals', () => { const zones = result().time_zones; for (const days of [1, 2, 3, 5, 8, 13, 21]) assert.ok(zones.some(zone => zone.days === days && zone.type === 'short')) })
test('time zones classify medium intervals', () => { const zones = result().time_zones; for (const days of [34, 55]) assert.ok(zones.some(zone => zone.days === days && zone.type === 'medium')) })
test('time zones classify long intervals', () => { const zones = result().time_zones; for (const days of [89, 144]) assert.ok(zones.some(zone => zone.days === days && zone.type === 'long')) })
test('time zones are strictly future dates', () => { const zones = result().time_zones; for (let i = 1; i < zones.length; i++) assert.ok(zones[i].date >= zones[i - 1].date) })
test('custom time zone base index is accepted', () => { const zones = analyzeFibonacci(up(), { timeZoneBaseIndex: 5 }).time_zones; assert.equal(zones[0].days, 1); assert.ok(zones[0].date.length === 10) })
test('confluence output is always an array', () => assert.ok(Array.isArray(result().confluence_points)))
test('confluence sources contain at least three sources when present', () => { for (const point of result().confluence_points) assert.ok(point.sources.length >= 3) })
test('confluence confidence is bounded', () => { for (const point of result().confluence_points) assert.ok(point.confidence >= 0 && point.confidence <= 1) })
test('confluence strength uses declared labels', () => { for (const point of result().confluence_points) assert.ok(['weak', 'moderate', 'strong', 'very_strong'].includes(point.strength)) })
test('output has data quality status', () => { const value = result(); assert.equal(value.data_quality.candles, 60); assert.equal(value.data_quality.minimum_required, 30) })
test('missing volume emits a warning without invalidating prices', () => { const value = analyzeFibonacci(up().map(item => ({ ...item, volume: undefined }))); assert.equal(value.available, true); assert.ok(value.data_quality.warnings.length > 0); assert.ok(value.retracement['61.8%'].price > 0) })
test('all retracement prices are finite', () => { for (const item of Object.values(result().retracement)) assert.ok(Number.isFinite(item.price)) })
test('all extension prices are finite', () => { for (const item of Object.values(result().extension)) assert.ok(Number.isFinite(item.price)) })
test('all time zone dates are ISO formatted', () => { for (const zone of result().time_zones) assert.match(zone.date, /^\d{4}-\d{2}-\d{2}$/) })
test('swing selection is limited to the latest 200 candles', () => { const value = analyzeFibonacci(up(260)); assert.equal(value.available, true); assert.ok(value.swing_reference.high_index >= 60) })
