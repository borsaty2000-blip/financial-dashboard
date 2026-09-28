import assert from 'node:assert/strict'
import test from 'node:test'
import { analyzeFibonacci } from '../src/services/analysis/fibonacci.service.js'
import { analyzeMarketRegime } from '../src/services/analysis/market-regime.service.js'
import { analyzeSupportResistance } from '../src/services/analysis/support-resistance.service.js'
import { buildDecisionSupport, calculateConfluence } from '../src/services/analysis/confluence.service.js'
import type { CompleteCandle } from '../src/services/analysis/indicators-complete.js'

function candle(index: number, close: number, volume = 1000): CompleteCandle { return { open: close - 0.4, high: close + 1.2, low: close - 1.2, close, volume, timestamp: `2026-08-${String((index % 28) + 1).padStart(2, '0')}` } }
const candles = Array.from({ length: 120 }, (_, i) => candle(i, 80 + i * 0.35, 1000 + i * 8))
const indicators = { rsi: { value: 62 }, macd: { value: { histogram: 1 } }, direction: 'bullish' }
const fullInput = () => ({ symbol: 'COMI', candles, elliott: { available: true, direction: 'up', confidence: 0.8 }, gann: { available: true, direction: 'up' }, indicators, harmonic: { status: 'success', pattern: 'Gartley' }, supportResistance: analyzeSupportResistance(candles) as any, fibonacci: analyzeFibonacci(candles), regime: analyzeMarketRegime('COMI', candles), classical: { available: true, patterns: [{ direction: 'bullish' }] }, multiTimeframe: { direction: 'up' }, wyckoff: { direction: 'accumulation' }, vsa: { direction: 'bullish' }, divergence: { direction: 'bullish' } })
function result() { return calculateConfluence(fullInput() as any) }

test('returns an available result with symbol', () => { const value = result(); assert.equal(value.available, true); assert.equal(value.symbol, 'COMI') })
test('returns exactly fifteen schools', () => assert.equal(result().schools.length, 15))
test('school names are unique', () => { const names = result().schools.map(item => item.nameEn); assert.equal(new Set(names).size, 15) })
test('base school weights sum to one hundred', () => assert.equal(result().schools.reduce((sum, item) => sum + item.weight, 0), 100))
test('adjusted available weights are normalized to one hundred', () => { const value = result(); const total = value.schools.filter(item => item.score != null).reduce((sum, item) => sum + item.adjusted_weight, 0); assert.ok(Math.abs(total - 100) < 0.1) })
test('every score is bounded or explicitly unavailable', () => { for (const item of result().schools) if (item.score != null) assert.ok(item.score >= 0 && item.score <= 100); else assert.equal(item.signal, 'UNAVAILABLE') })
test('every signal uses the declared contract', () => { for (const item of result().schools) assert.ok(['BUY', 'SELL', 'NEUTRAL', 'UNAVAILABLE'].includes(item.signal)) })
test('bullish and bearish confluence are bounded', () => { const value = result(); assert.ok(value.bullish_confluence >= 0 && value.bullish_confluence <= 100); assert.ok(value.bearish_confluence >= 0 && value.bearish_confluence <= 100) })
test('neutral is bounded', () => assert.ok(result().neutral >= 0 && result().neutral <= 100))
test('verdict uses the five-level contract', () => assert.ok(['STRONG_BUY', 'BUY', 'NEUTRAL', 'SELL', 'STRONG_SELL'].includes(result().verdict)))
test('verdict has Arabic label', () => assert.ok(result().verdictAr.length > 0))
test('confidence is bounded and is not a profit probability', () => { const value = result(); assert.ok(value.confidence >= 0 && value.confidence <= 1); assert.match(value.disclaimer, /توافق الأدلة/) })
test('trend school is sourced from indicators', () => assert.equal(result().schools.find(item => item.nameEn === 'Trend')?.source, 'indicators'))
test('momentum school reads RSI', () => assert.equal(result().schools.find(item => item.nameEn === 'Momentum')?.score, 68))
test('volume school reads candle volume', () => assert.ok(result().schools.find(item => item.nameEn === 'Volume')?.score != null))
test('market structure reads MTF direction', () => assert.equal(result().schools.find(item => item.nameEn === 'Market Structure')?.score, 75))
test('support resistance school uses its engine', () => assert.ok(result().schools.find(item => item.nameEn === 'Support/Resistance')?.score != null))
test('fibonacci school uses confluence points', () => assert.ok(result().schools.find(item => item.nameEn === 'Fibonacci')?.score != null))
test('Elliott unavailable is not scored', () => { const value = calculateConfluence({ ...fullInput(), elliott: { available: false } } as any); const item = value.schools.find(school => school.nameEn === 'Elliott Wave')!; assert.equal(item.score, null); assert.equal(item.signal, 'UNAVAILABLE') })
test('Gann school is scored when available', () => assert.ok(result().schools.find(item => item.nameEn === 'Gann')?.score != null))
test('confirmed harmonic is scored', () => assert.equal(result().schools.find(item => item.nameEn === 'Harmonic')?.score, 75))
test('classical pattern direction is used', () => assert.equal(result().schools.find(item => item.nameEn === 'Classical Patterns')?.score, 72))
test('Wyckoff accumulation is bullish', () => assert.equal(result().schools.find(item => item.nameEn === 'Wyckoff')?.score, 75))
test('VSA unavailable is listed in missing data', () => { const value = calculateConfluence({ ...fullInput(), vsa: undefined } as any); assert.ok(value.missing_data.some(item => item.startsWith('VSA:'))) })
test('volatility school is sourced from regime', () => assert.equal(result().schools.find(item => item.nameEn === 'Volatility')?.source, 'indicators'))
test('divergence school is scored when supplied', () => assert.equal(result().schools.find(item => item.nameEn === 'Divergence')?.score, 75))
test('market regime school is scored when regime is available', () => assert.ok(result().schools.find(item => item.nameEn === 'Market Regime')?.score != null))
test('supporting evidence contains bullish schools', () => assert.ok(result().supporting_evidence.length > 0))
test('contradicting evidence contains bearish schools when present', () => { const value = calculateConfluence({ ...fullInput(), gann: { available: true, direction: 'down' } } as any); assert.ok(value.contradicting_evidence.some(item => item.includes('جان'))) })
test('missing data is transparent', () => { const value = calculateConfluence({ candles: candles as any, elliott: null, gann: null, indicators: null, harmonic: { status: 'insufficient_data' } }); assert.ok(value.missing_data.length > 0); assert.equal(value.data_quality.sources_missing, value.missing_data.length) })
test('data quality counts available sources', () => { const value = result(); assert.equal(value.data_quality.sources_available + value.data_quality.sources_missing, 15) })
test('top signals are limited to three', () => assert.ok(result().top_signals.length <= 3))
test('risk notes are limited and evidence-based', () => assert.ok(result().risk_notes.length <= 3))
test('regime weight changes adjusted trend weight', () => { const value = result(); const trend = value.schools.find(item => item.nameEn === 'Trend')!; assert.ok(trend.regime_weight > 0) })
test('no school weight is negative', () => { for (const item of result().schools) { assert.ok(item.weight >= 0); assert.ok(item.adjusted_weight >= 0) } })
test('harmonic engine still returns insufficient data safely', () => { const value = calculateConfluence({ candles: candles.slice(0, 20) as any, elliott: null, gann: null, indicators: null, harmonic: { status: 'insufficient_data' } }); assert.equal(value.schools.find(item => item.nameEn === 'Harmonic')?.score, null) })
test('recommendation follows strong bullish confluence score', () => { const value = buildDecisionSupport(80, candles as any); assert.equal(value.recommendation.type, 'STRONG_BUY'); assert.ok(value.recommendation.target_1 != null) })
test('recommendation follows neutral score', () => assert.equal(buildDecisionSupport(50, candles as any).recommendation.type, 'NEUTRAL'))
test('recommendation contains entry zone and stop', () => { const value = buildDecisionSupport(65, candles as any); assert.equal(value.recommendation.entry_zone?.length, 2); assert.ok(value.recommendation.stop_loss != null) })
test('recommendation exposes three targets', () => { const value = buildDecisionSupport(65, candles as any); assert.ok(value.recommendation.target_1 != null); assert.ok(value.recommendation.target_2 != null); assert.ok(value.recommendation.target_3 != null) })
test('recommendation contains daily timeframe', () => assert.equal(buildDecisionSupport(65, candles as any).recommendation.timeframe, 'daily'))
test('recommendation disclaimer rejects certainty', () => assert.match(buildDecisionSupport(65, candles as any).disclaimer, /ليس ضماناً/))
test('empty candles do not fabricate scores', () => { const value = calculateConfluence({ candles: [], elliott: null, gann: null, indicators: null, harmonic: { status: 'insufficient_data' } }); assert.equal(value.available, false); assert.equal(value.bullish_confluence, 0) })
