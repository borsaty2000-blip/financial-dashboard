import { CandlesService, type Candle, type CandleMarket } from '../market/candles.service.js'
import { QualityGuardian } from '../market/quality-guardian.js'
import { analyzeElliottMTF } from './elliott-mtf.python.js'
import { analyzeGann } from './gann.python.js'
import { analyzeHarmonic, buildDecisionSupport, calculateConfluence } from './confluence.service.js'
import { completeIndicatorLibrary } from './indicators-complete.js'
import { analyzeWyckoff } from './wyckoff.service.js'
import { analyzeVsa } from './vsa.service.js'
import { analyzeClassicalPatterns } from './classical-patterns.service.js'
import { analyzeSupportResistance } from './support-resistance.service.js'
import { analyzeFibonacci } from './fibonacci.service.js'
import { analyzeMultiTimeframe, type Timeframe } from './multi-timeframe.service.js'
import { analyzeMarketRegime } from './market-regime.service.js'
import { runBacktest } from './backtesting.service.js'
import type { QualityStatus } from '../market/data-quality.js'

const CACHE_TTL_MS = 5 * 60 * 1000
const LONG_ENGINE_TIMEOUT_MS = 12_000
const STANDARD_ENGINE_TIMEOUT_MS = 8_000
const BACKTEST_TIMEOUT_MS = 20_000
export const ANALYSIS_ENGINE_NAMES = ['elliott', 'gann', 'harmonic', 'wyckoff', 'vsa', 'classical_patterns', 'support_resistance', 'fibonacci', 'indicators', 'multi_timeframe', 'market_regime', 'divergence', 'confluence', 'recommendation', 'backtesting'] as const

type DataQuality = {
	status: QualityStatus
	provider: string
	timestamp: string
	warnings: string[]
}

export type EngineResult<T = unknown> = {
	available: boolean
	data: T | null
	source: string
	latency_ms: number
	error: string | null
	data_quality: DataQuality
}

export type CompleteAnalysis = {
	symbol: string
	market: CandleMarket
	price: number | null
	fetched_at: string
	execution_time_ms: number
	latency_ms: number
	cache_hit: boolean
	candles: { count: number; source: string; available: boolean; data_quality: unknown; warnings: string[] }
	elliott: EngineResult
	gann: EngineResult
	harmonic: EngineResult
	wyckoff: EngineResult
	vsa: EngineResult
	classical_patterns: EngineResult
	support_resistance: EngineResult
	fibonacci: EngineResult
	indicators: EngineResult
	multi_timeframe: EngineResult
	market_regime: EngineResult
	divergence: EngineResult
	confluence: EngineResult
	recommendation: EngineResult
	backtesting: EngineResult
	integrity: { score: number; engines_ok: number; engines_total: number; warnings: string[]; issues: string[]; cache_hit: boolean }
	top_signals: Array<{ engine: string; signal: 'BUY' | 'SELL' | 'NEUTRAL'; confidence: number }>
}

type Cached = { value: CompleteAnalysis; expires: number }
const cache = new Map<string, Cached>()

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' ? value as Record<string, unknown> : null
const asNumber = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback

function qualityFor(source: string, timestamp: string, warnings: string[] = [], available = true): DataQuality {
	const status: DataQuality['status'] = !available ? 'unavailable' : source === 'database-cache' ? 'historical' : ['Yahoo Finance', 'Stooq', 'SAHMK historical'].includes(source) ? 'delayed' : 'live'
	return { status, provider: source || 'unavailable', timestamp, warnings: [...warnings] }
}

function aggregate(candles: Candle[], size: number): Candle[] {
	if (size <= 1) return candles
	const output: Candle[] = []
	for (let index = 0; index < candles.length; index += size) {
		const group = candles.slice(index, index + size)
		if (!group.length) continue
		output.push({ ...(group.at(-1) as Candle), open: group[0].open ?? group[0].close, high: Math.max(...group.map(item => item.high ?? item.close)), low: Math.min(...group.map(item => item.low ?? item.close)), close: group.at(-1)!.close, volume: group.reduce((sum, item) => sum + (item.volume ?? 0), 0) })
	}
	return output
}

function timeframeCandles(candles: Candle[]): Partial<Record<Timeframe, Candle[]>> {
	return { '1d': candles, '1w': aggregate(candles, 5), '1M': aggregate(candles, 21) }
}

function unavailableEngine(timestamp: string, source: string, error: string, warnings: string[] = []): EngineResult {
	return { available: false, data: null, source: source || 'unavailable', latency_ms: 0, error, data_quality: qualityFor(source, timestamp, warnings, false) }
}

export async function safeEngine<T>(name: string, fn: () => Promise<T> | T, timeoutMs: number, source: string, timestamp: string, warnings: string[] = []): Promise<EngineResult<T>> {
	const started = Date.now()
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		const result = await Promise.race([
			Promise.resolve().then(fn),
			new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`${name}_timeout_${timeoutMs}ms`)), timeoutMs) }),
		])
		const record = asRecord(result)
		const data = (record && 'data' in record && record.data != null ? record.data : result) as T | null
		const available = data != null && (!(record && 'available' in record) || record.available !== false)
		const resultSource = record && typeof record.source === 'string' ? record.source : source
		const resultWarnings = record && Array.isArray(record.warnings) ? record.warnings.map(String) : warnings
		return { available, data: available ? data : null, source: resultSource, latency_ms: Date.now() - started, error: available ? null : String(record?.reason ?? 'No data'), data_quality: qualityFor(resultSource, timestamp, resultWarnings, available) }
	} catch (error) {
		return { available: false, data: null, source: 'unavailable', latency_ms: Date.now() - started, error: error instanceof Error ? error.message : 'Unknown engine error', data_quality: qualityFor('unavailable', timestamp, warnings, false) }
	} finally {
		if (timer) clearTimeout(timer)
	}
}

function signalFrom(value: unknown): { signal: 'BUY' | 'SELL' | 'NEUTRAL'; confidence: number } | null {
	const record = asRecord(value)
	const candidates = [record?.signal, record?.overall_signal, record?.type, record?.expected_action, record?.phase, record?.current_regime]
	const text = candidates.map(item => typeof item === 'string' ? item : asRecord(item)?.signal ?? asRecord(item)?.regime ?? '').join(' ').toLowerCase()
	if (!text) return null
	const signal = text.includes('buy') || text.includes('bull') || text.includes('markup') || text.includes('accumulation') || text.includes('up') ? 'BUY' : text.includes('sell') || text.includes('bear') || text.includes('markdown') || text.includes('distribution') || text.includes('down') ? 'SELL' : 'NEUTRAL'
	const confidence = Math.max(0, Math.min(1, asNumber(record?.confidence, asNumber(asRecord(record?.summary)?.confidence, 0.5))))
	return { signal, confidence }
}

function topSignals(engines: Array<[string, EngineResult]>): CompleteAnalysis['top_signals'] {
	return engines.map(([engine, result]) => {
		const signal = signalFrom(result.data)
		return signal ? { engine, ...signal } : null
	}).filter((item): item is CompleteAnalysis['top_signals'][number] => item != null).sort((a, b) => b.confidence - a.confidence).slice(0, 5)
}

export class AnalysisOrchestrator {
	static async analyze(symbol: string, market: CandleMarket = 'EGX'): Promise<CompleteAnalysis> {
		const normalized = symbol.trim().toUpperCase()
		const key = `${market}:${normalized}`
		const cached = cache.get(key)
		if (cached && cached.expires > Date.now()) return { ...cached.value, integrity: { ...cached.value.integrity, cache_hit: true }, cache_hit: true, candles: { ...cached.value.candles }, execution_time_ms: 0, latency_ms: 0 }
		const started = Date.now()
		const fetchedAt = new Date().toISOString()
		let series: Awaited<ReturnType<typeof CandlesService.getCandles>>
		try {
			series = await CandlesService.getCandles(normalized, market, '1d', 500)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'candle_fetch_failed'
			const failed = this.unavailable(normalized, market, fetchedAt, message)
			cache.set(key, { value: failed, expires: Date.now() + CACHE_TTL_MS })
			return failed
		}
		const validation = QualityGuardian.validate(series.candles, 30)
		const candlesMeta = { count: validation.clean.length, source: series.source, available: validation.valid, data_quality: series.data_quality, warnings: validation.issues }
		if (!validation.valid) {
			const failed = this.unavailable(normalized, market, fetchedAt, `insufficient_valid_candles:${validation.clean.length}`, candlesMeta)
			cache.set(key, { value: failed, expires: Date.now() + CACHE_TTL_MS })
			return failed
		}
		const candles = validation.clean as Candle[]
		const source = series.source
		const baseWarnings = validation.issues
		const prices = candles.map(item => item.close)
		const dates = candles.map(item => String((item as Candle & { date?: string }).date ?? ''))
		const frames = timeframeCandles(candles)
		const settledEntries = await Promise.allSettled([
			safeEngine('elliott', () => analyzeElliottMTF(candles), LONG_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('gann', () => analyzeGann(prices, dates), LONG_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('harmonic', () => analyzeHarmonic(candles), LONG_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('wyckoff', () => analyzeWyckoff(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('vsa', () => analyzeVsa(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('classical_patterns', () => analyzeClassicalPatterns(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('support_resistance', () => analyzeSupportResistance(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('fibonacci', () => analyzeFibonacci(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('indicators', () => completeIndicatorLibrary(candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('multi_timeframe', () => analyzeMultiTimeframe(normalized, market, frames, source), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('market_regime', () => analyzeMarketRegime(normalized, candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings),
			safeEngine('backtesting', () => runBacktest(candles), BACKTEST_TIMEOUT_MS, source, fetchedAt, baseWarnings),
		])
		const baseEntries = settledEntries.map((item, index) => item.status === 'fulfilled' ? item.value : unavailableEngine(ANALYSIS_ENGINE_NAMES[index], source, item.reason instanceof Error ? item.reason.message : 'engine_failed', baseWarnings))
		const [elliott, gann, harmonic, wyckoff, vsa, classicalPatterns, supportResistance, fibonacci, indicators, multiTimeframe, marketRegime, backtesting] = baseEntries
		const divergence = await safeEngine('divergence', () => ({ divergences: asRecord(multiTimeframe.data)?.divergences ?? [], source: 'multi-timeframe' }), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings)
		const confluence = await safeEngine('confluence', () => calculateConfluence({ symbol: normalized, candles, elliott: asRecord(elliott.data), gann: asRecord(gann.data), indicators: asRecord(indicators.data), harmonic: asRecord(harmonic.data) ?? { status: 'insufficient_data' }, supportResistance: asRecord(supportResistance.data) as never, fibonacci: asRecord(fibonacci.data) as never, regime: asRecord(marketRegime.data) as never, classical: asRecord(classicalPatterns.data) as never, multiTimeframe: asRecord(multiTimeframe.data), wyckoff: asRecord(wyckoff.data), vsa: asRecord(vsa.data), divergence: asRecord(divergence.data) }), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings)
		const confluenceScore = asNumber(asRecord(confluence.data)?.bullish_confluence, 50)
		const recommendation = await safeEngine('recommendation', () => buildDecisionSupport(confluenceScore, candles), STANDARD_ENGINE_TIMEOUT_MS, source, fetchedAt, baseWarnings)
		const engines: Array<[string, EngineResult]> = ANALYSIS_ENGINE_NAMES.map(name => [name, ({ elliott, gann, harmonic, wyckoff, vsa, classical_patterns: classicalPatterns, support_resistance: supportResistance, fibonacci, indicators, multi_timeframe: multiTimeframe, market_regime: marketRegime, divergence, confluence, recommendation, backtesting } as Record<string, EngineResult>)[name]])
		const enginesOk = engines.filter(([, result]) => result.available).length
		const result: CompleteAnalysis = {
			symbol: normalized, market, price: candles.at(-1)?.close ?? null, fetched_at: fetchedAt, execution_time_ms: Date.now() - started, candles: candlesMeta,
			elliott, gann, harmonic, wyckoff, vsa, classical_patterns: classicalPatterns, support_resistance: supportResistance, fibonacci, indicators, multi_timeframe: multiTimeframe, market_regime: marketRegime, divergence, confluence, recommendation, backtesting,
			latency_ms: Date.now() - started, cache_hit: false,
			integrity: { score: Math.round((enginesOk / engines.length) * 100), engines_ok: enginesOk, engines_total: engines.length, warnings: [...baseWarnings, ...engines.flatMap(([, item]) => item.error ? [item.error] : [])], issues: [...baseWarnings, ...engines.flatMap(([, item]) => item.error ? [item.error] : [])], cache_hit: false },
			top_signals: topSignals(engines),
		}
		cache.set(key, { value: result, expires: Date.now() + CACHE_TTL_MS })
		return result
	}

	static clearCache(symbol?: string, market?: CandleMarket) {
		if (symbol) cache.delete(`${market ?? 'EGX'}:${symbol.trim().toUpperCase()}`)
		else cache.clear()
	}

	static cacheSize() { return cache.size }

	private static unavailable(symbol: string, market: CandleMarket, fetchedAt: string, error: string, candles: CompleteAnalysis['candles'] = { count: 0, source: 'unavailable', available: false, data_quality: qualityFor('unavailable', fetchedAt, [error], false), warnings: [error] }): CompleteAnalysis {
		const results = Object.fromEntries(ANALYSIS_ENGINE_NAMES.map(name => [name, unavailableEngine(name, 'unavailable', error, [error])])) as Record<string, EngineResult>
		return { symbol, market, price: null, fetched_at: fetchedAt, execution_time_ms: 0, latency_ms: 0, cache_hit: false, candles, ...results as Omit<CompleteAnalysis, 'symbol' | 'market' | 'price' | 'fetched_at' | 'execution_time_ms' | 'latency_ms' | 'cache_hit' | 'candles' | 'integrity' | 'top_signals'>, integrity: { score: 0, engines_ok: 0, engines_total: ANALYSIS_ENGINE_NAMES.length, warnings: [error], issues: [error], cache_hit: false }, top_signals: [] }
	}
}
