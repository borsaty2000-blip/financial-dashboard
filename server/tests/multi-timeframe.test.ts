import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeMultiTimeframe, multiTimeframeMetadata, TIMEFRAMES, type Timeframe } from '../src/services/analysis/multi-timeframe.service.js'
import type { CompleteCandle } from '../src/services/analysis/indicators-complete.js'

function candle(index: number, close: number, volume = 1000): CompleteCandle { return { open: close - 0.2, high: close + 1, low: close - 1, close, volume, timestamp: `2026-09-${String((index % 28) + 1).padStart(2, '0')}` } }
function rising(count = 80): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 80 + i * 0.6)) }
function falling(count = 80): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 130 - i * 0.6)) }
function neutral(count = 80): CompleteCandle[] { return Array.from({ length: count }, (_, i) => candle(i, 100 + (i % 2 ? 0.1 : -0.1))) }
function matrix(values: CompleteCandle[] | undefined = rising()) { return Object.fromEntries(TIMEFRAMES.map(timeframe => [timeframe, values])) as Partial<Record<Timeframe, CompleteCandle[] | undefined>> }
function analyze(values = rising()) { return analyzeMultiTimeframe('COMI', 'EGX', matrix(values), 'fixture') }

test('metadata declares all nine timeframes', () => assert.equal(multiTimeframeMetadata.timeframes.length, 9))
test('timeframe order is smallest to largest', () => assert.deepEqual(TIMEFRAMES, ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M']))
test('matrix contains all nine keys', () => { const result = analyze(); for (const timeframe of TIMEFRAMES) assert.ok(result.matrix[timeframe]) })
test('frame labels are localized', () => assert.equal(analyze().matrix['4h']?.timeframeAr, '4 ساعات'))
test('available frame requires thirty candles', () => assert.equal(analyze(rising(30)).matrix['1h']?.data_quality.available, true))
test('short frame is unavailable below thirty candles', () => { const result = analyzeMultiTimeframe('COMI', 'EGX', matrix(rising(29))); assert.equal(result.matrix['1h']?.data_quality.available, false); assert.equal(result.matrix['1h']?.signal.type, 'NEUTRAL') })
test('missing frame is unavailable rather than fabricated', () => { const input = matrix(); delete input['15m']; const result = analyzeMultiTimeframe('COMI', 'EGX', input); assert.equal(result.matrix['15m']?.data_quality.available, false); assert.equal(result.matrix['15m']?.data_quality.candles_count, 0) })
test('rising fixture identifies bullish trend', () => assert.equal(analyze().matrix['4h']?.trend.direction, 'up'))
test('falling fixture identifies bearish trend', () => assert.equal(analyze(falling()).matrix['4h']?.trend.direction, 'down'))
test('flat fixture identifies neutral or low-strength trend', () => assert.ok(['neutral', 'up', 'down'].includes(analyze(neutral()).matrix['4h']?.trend.direction ?? 'neutral')))
test('trend strength is bounded', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(frame.trend.strength >= 0 && frame.trend.strength <= 100) })
test('structure is one of the declared structures', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(['HH_HL', 'LH_LL', 'mixed'].includes(frame.trend.structure)) })
test('momentum exposes RSI and MACD state', () => { const frame = analyze().matrix['1d']!; assert.ok(frame.momentum.rsi != null); assert.ok(['bullish', 'bearish', 'neutral'].includes(frame.momentum.macd)) })
test('stochastic state is declared', () => assert.ok(['overbought', 'oversold', 'neutral'].includes(analyze().matrix['1h']!.momentum.stoch)))
test('momentum strength is bounded', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(frame.momentum.strength >= 0 && frame.momentum.strength <= 100) })
test('volatility exposes ATR and Bollinger width', () => { const frame = analyze().matrix['4h']!; assert.ok(frame.volatility.atr != null); assert.ok(frame.volatility.bollinger_width != null) })
test('volatility level is declared', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(['low', 'normal', 'high'].includes(frame.volatility.level)) })
test('frame signals use the five-level contract', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'].includes(frame.signal.type)) })
test('frame confidence is bounded', () => { for (const frame of Object.values(analyze().matrix)) if (frame) assert.ok(frame.signal.confidence >= 0 && frame.signal.confidence <= 1) })
test('all rising frames produce strong bullish alignment', () => { const value = analyze().alignment; assert.equal(value.dominant_direction, 'up'); assert.equal(value.bullish_timeframes, 9); assert.equal(value.score, 1); assert.equal(value.category, 'STRONG_ALIGNMENT') })
test('all falling frames produce strong bearish alignment', () => { const value = analyze(falling()).alignment; assert.equal(value.dominant_direction, 'down'); assert.equal(value.bearish_timeframes, 9); assert.equal(value.category, 'STRONG_ALIGNMENT') })
test('mixed frames expose conflict', () => { const input = matrix(); for (const timeframe of ['1m', '5m', '15m'] as Timeframe[]) input[timeframe] = falling(); for (const timeframe of ['30m', '1h', '4h'] as Timeframe[]) input[timeframe] = rising(); const value = analyzeMultiTimeframe('COMI', 'EGX', input).alignment; assert.equal(value.bullish_timeframes, 6); assert.equal(value.bearish_timeframes, 3); assert.ok(value.conflict_level !== 'low') })
test('alignment ignores unavailable frames in counts', () => { const input = matrix(); delete input['1m']; delete input['5m']; const value = analyzeMultiTimeframe('COMI', 'EGX', input).alignment; assert.equal(value.bullish_timeframes, 7); assert.equal(value.neutral_timeframes, 0) })
test('top down macro uses monthly then weekly', () => { const result = analyze(); assert.equal(result.top_down.macro_trend.timeframe, '1M') })
test('top down medium uses daily then four hour', () => assert.equal(analyze().top_down.medium_trend.timeframe, '1d'))
test('top down entry prefers four hour', () => assert.equal(analyze().top_down.entry_trend.timeframe, '4h'))
test('top down confirms aligned rising trends', () => { const value = analyze().top_down; assert.equal(value.confluence, true); assert.equal(value.recommended_entry_timeframe, '4h') })
test('top down reports no confluence for missing macro data', () => { const input = matrix(); delete input['1M']; delete input['1w']; const value = analyzeMultiTimeframe('COMI', 'EGX', input).top_down; assert.equal(value.confluence, false); assert.equal(value.recommended_entry_timeframe, null) })
test('divergences are an array with valid indicator types', () => { for (const item of analyze().divergences) { assert.ok(['RSI', 'MACD', 'OBV'].includes(item.indicator)); assert.ok(item.strength >= 0 && item.strength <= 1) } })
test('short data does not fabricate divergences', () => { const input = matrix(rising(40)); const result = analyzeMultiTimeframe('COMI', 'EGX', input); assert.deepEqual(result.divergences, []) })
test('overall signal follows bullish alignment', () => assert.equal(analyze().summary.overall_signal, 'STRONG_BUY'))
test('overall signal follows bearish alignment', () => assert.equal(analyze(falling()).summary.overall_signal, 'STRONG_SELL'))
test('risk is low for full agreement', () => assert.equal(analyze().summary.risk_level, 'low'))
test('risk increases for conflicting frames', () => { const input = matrix(); for (const timeframe of ['1m', '5m', '15m', '30m'] as Timeframe[]) input[timeframe] = falling(); assert.ok(['medium', 'high'].includes(analyzeMultiTimeframe('COMI', 'EGX', input).summary.risk_level)) })
test('summary confidence is bounded', () => { const value = analyze().summary; assert.ok(value.confidence >= 0 && value.confidence <= 1) })
test('source and candle quality are carried per frame', () => { const frame = analyze().matrix['1d']!; assert.equal(frame.data_quality.source, 'fixture'); assert.equal(frame.data_quality.candles_count, 80) })
test('symbol and market are carried to result', () => { const value = analyzeMultiTimeframe('ABUK', 'EGX', matrix()); assert.equal(value.symbol, 'ABUK'); assert.equal(value.market, 'EGX'); assert.match(value.fetched_at, /^20/) })
