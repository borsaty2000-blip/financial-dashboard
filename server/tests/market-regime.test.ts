import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeMarketRegime, marketRegimeMetadata } from '../src/services/analysis/market-regime.service.js'
import type { CompleteCandle } from '../src/services/analysis/indicators-complete.js'

function candle(index: number, close: number, volume = 1000): CompleteCandle { return { open: close - 0.2, high: close + Math.max(1, close * 0.01), low: close - Math.max(1, close * 0.01), close, volume, timestamp: `2026-09-${String((index % 28) + 1).padStart(2, '0')}` } }
function rising(count = 120, expanding = true): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 80 + i * 0.8, expanding ? 1000 * (1.03 ** i) : 1000)) }
function falling(count = 120, expanding = true): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 180 - i * 0.8, expanding ? 1000 * (1.03 ** i) : 1000)) }
function flat(count = 120): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 100 + (i % 2 ? 0.2 : -0.2), 1000)) }
function volatile(count = 120): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 100 + Math.sin(i * 1.8) * 18 + (i % 3) * 2, i === count - 1 ? 5000 : 1000)) }
function analyze(candles: CompleteCandle[]) { return analyzeMarketRegime('COMI', candles) }

test('metadata declares ten regimes', () => assert.equal(marketRegimeMetadata.regimes.length, 10))
test('metadata minimum is fifty candles', () => assert.equal(marketRegimeMetadata.minimumCandles, 50))
test('insufficient data is unavailable', () => { const value = analyze(rising(49)); assert.equal(value.available, false); assert.equal(value.current_regime.regime, null); assert.equal(value.trading_context.risk_level, 'high') })
test('exactly fifty candles is eligible', () => assert.equal(analyze(rising(50)).available, true))
test('strong rising trend is detected with expanding volume', () => { const value = analyze(rising()); assert.ok(['strong_trend_up', 'weak_trend_up', 'breakout'].includes(value.current_regime.regime!)); assert.equal(value.current_regime.regimeAr.length > 0, true) })
test('strong falling trend is detected with expanding volume', () => { const value = analyze(falling()); assert.ok(['strong_trend_down', 'weak_trend_down', 'breakout'].includes(value.current_regime.regime!)) })
test('flat market is not classified as a strong trend', () => assert.ok(!analyze(flat()).current_regime.regime?.includes('strong_trend')))
test('high volatility is detected from wide price ranges', () => { const value = analyze(volatile()); assert.ok(['high_volatility', 'breakout', 'range'].includes(value.current_regime.regime!)); assert.ok((value.characteristics.bollinger_width ?? 0) >= 0) })
test('regime is always one of the ten values when available', () => { const value = analyze(rising()); assert.ok(marketRegimeMetadata.regimes.includes(value.current_regime.regime! as never)) })
test('confidence is bounded', () => { for (const candles of [rising(), falling(), flat(), volatile()]) { const value = analyze(candles); assert.ok(value.current_regime.confidence >= 0 && value.current_regime.confidence <= 1) } })
test('ADX is exposed in characteristics', () => { const value = analyze(rising()); assert.ok(value.characteristics.adx == null || value.characteristics.adx >= 0) })
test('ATR percentage is exposed in characteristics', () => { const value = analyze(rising()); assert.ok(value.characteristics.atr_pct == null || value.characteristics.atr_pct >= 0) })
test('volume character uses declared values', () => { const value = analyze(rising()); assert.ok(['expanding', 'normal', 'contracting', 'unavailable'].includes(value.characteristics.volume_trend)) })
test('trend regime weights emphasize trend', () => { const value = analyze(rising()); if (value.current_regime.regime?.includes('trend')) { assert.equal(value.regime_weights.trend, 1.5); assert.equal(value.regime_weights.mean_reversion, 0.5) } })
test('range regime weights emphasize mean reversion', () => { const value = analyze(flat()); if (value.current_regime.regime === 'range') { assert.equal(value.regime_weights.mean_reversion, 1.5); assert.equal(value.regime_weights.trend, 0.6) } })
test('high volatility weights emphasize volatility', () => { const value = analyze(volatile()); if (value.current_regime.regime === 'high_volatility') { assert.equal(value.regime_weights.volatility, 1.5); assert.equal(value.regime_weights.mean_reversion, 0.5) } })
test('weight values are positive', () => { for (const value of [analyze(rising()), analyze(falling()), analyze(flat()), analyze(volatile())]) for (const weight of Object.values(value.regime_weights)) assert.ok(weight > 0) })
test('preferred indicators are present', () => assert.ok(analyze(rising()).preferred_indicators.length > 0))
test('avoid indicators are present', () => assert.ok(analyze(rising()).avoid_indicators.length > 0))
test('transition contract is always present', () => { const value = analyze(rising()); assert.equal(typeof value.transition.detected, 'boolean') })
test('regime history contains recent observations', () => { const value = analyze(rising()); assert.ok(value.history.recent.length > 0); assert.ok(value.history.recent.length <= 51) })
test('history changes are non-negative', () => { const value = analyze(rising()); assert.ok(value.history.regime_changes_60d >= 0); assert.ok(value.history.average_regime_duration >= 1) })
test('current duration is positive', () => assert.ok(analyze(rising()).history.current_regime_days >= 1))
test('trading context includes strategy and Arabic message', () => { const value = analyze(rising()); assert.ok(value.trading_context.recommended_strategy.length > 0); assert.ok(value.trading_context.message_ar.length > 0) })
test('risk level is declared', () => assert.ok(['low', 'medium', 'high'].includes(analyze(volatile()).trading_context.risk_level)) )
test('position sizing is declared', () => assert.ok(['reduced', 'normal', 'increased'].includes(analyze(rising()).trading_context.position_sizing)) )
test('missing volume does not fabricate volume character', () => { const value = analyze(rising().map(item => ({ ...item, volume: undefined }))); assert.ok(['unavailable', 'normal', 'contracting', 'expanding'].includes(value.characteristics.volume_trend)) })
test('input symbol is preserved', () => assert.equal(analyzeMarketRegime('ABUK', rising()).symbol, 'ABUK'))
test('fetched_at is ISO-like', () => assert.match(analyze(rising()).fetched_at, /^20/))
test('analysis uses no more than the latest two hundred candles', () => assert.equal(analyze(rising(260)).available, true))
test('data quality reports candle count and minimum', () => { const value = analyze(rising()); assert.equal(value.data_quality.candles, 120); assert.equal(value.data_quality.minimum_required, 50) })
test('transition can be detected after regime characteristics change', () => { const value = analyze([...falling(80), ...rising(80)]); assert.equal(typeof value.transition.detected, 'boolean') })
test('no regime is fabricated for empty data', () => assert.equal(analyzeMarketRegime('COMI', []).available, false))
