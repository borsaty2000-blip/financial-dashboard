import { CandlesService, type CandleMarket } from '../market/candles.service.js'
import { QualityGuardian } from '../market/quality-guardian.js'
import { analyzeElliottMTF } from './elliott-mtf.python.js'
import { analyzeGann } from './gann.python.js'
import { analyzeHarmonic, calculateConfluence, buildDecisionSupport } from './confluence.service.js'
import { calculateIndicatorSnapshot } from './indicators.service.js'

const CACHE_TTL_MS = 5 * 60 * 1000
const cache = new Map<string, { expires: number; value: AnalysisResult }>()

type Engine<T> = { available: boolean; data: T | null; latency_ms: number; reason?: string }
export type AnalysisResult = {
	symbol: string
	market: CandleMarket
	cache_hit: boolean
	candles: { count: number; source: string; data_quality: unknown; issues: string[] }
	elliott: Engine<Record<string, unknown>>
	gann: Engine<Record<string, unknown>>
	harmonic: Engine<Record<string, unknown>>
	indicators: Engine<Record<string, unknown>>
	confluence: Engine<Record<string, unknown>>
	recommendation: Engine<Record<string, unknown>>
	integrity: { score: number; available_engines: number; total_engines: number; issues: string[] }
	latency_ms: number
}

const withTimeout = async <T>(task: Promise<T>, ms: number): Promise<T> => {
	let timer: ReturnType<typeof setTimeout> | undefined
	try {
		return await Promise.race([
			task,
			new Promise<T>((_, reject) => {
				timer = setTimeout(() => reject(new Error(`analysis_timeout_${ms}ms`)), ms)
			}),
		])
	} finally {
		if (timer) clearTimeout(timer)
	}
}

const timed = async <T>(task: Promise<T>, ms: number, normalize: (value: T) => Record<string, unknown> | null): Promise<Engine<Record<string, unknown>>> => {
	const started = Date.now()
	try {
		const value = normalize(await withTimeout(task, ms))
		return { available: value != null, data: value, latency_ms: Date.now() - started, ...(value == null ? { reason: 'empty_result' } : {}) }
	} catch (error) {
		return { available: false, data: null, latency_ms: Date.now() - started, reason: error instanceof Error ? error.message : 'engine_failed' }
	}
}

const asRecord = (value: unknown): Record<string, unknown> | null => value && typeof value === 'object' ? value as Record<string, unknown> : null

export class AnalysisOrchestrator {
	static async analyze(symbol: string, market: CandleMarket = 'EGX'): Promise<AnalysisResult> {
		const normalized = symbol.trim().toUpperCase()
		const key = `${market}:${normalized}`
		const cached = cache.get(key)
		if (cached && cached.expires > Date.now()) return { ...cached.value, cache_hit: true }
		const started = Date.now()
		const series = await CandlesService.getCandles(normalized, market, '1d', 250)
		const validation = QualityGuardian.validate(series.candles, 30)
		const base = {
			symbol: normalized,
			market,
			cache_hit: false,
			candles: { count: validation.clean.length, source: series.source, data_quality: series.data_quality, issues: validation.issues },
		}
		if (!validation.valid) {
			const unavailable = { available: false, data: null, latency_ms: 0, reason: `insufficient_valid_candles:${validation.clean.length}` }
			return { ...base, elliott: unavailable, gann: unavailable, harmonic: unavailable, indicators: unavailable, confluence: unavailable, recommendation: unavailable, integrity: { score: 0, available_engines: 0, total_engines: 6, issues: ['insufficient_valid_candles'] }, latency_ms: Date.now() - started }
		}

		const candles = validation.clean
		const prices = candles.map((item) => item.close)
		const dates = candles.map((item) => String(item.date))
		const elliottPromise = timed(analyzeElliottMTF(candles), 12000, asRecord)
		const gannPromise = timed(analyzeGann(prices, dates), 12000, asRecord)
		const harmonicPromise = timed(Promise.resolve(analyzeHarmonic(candles)), 10000, asRecord)
		const indicatorsPromise = timed(Promise.resolve(calculateIndicatorSnapshot(normalized, candles)), 10000, asRecord)
		const [elliott, gann, harmonic, indicators] = await Promise.all([elliottPromise, gannPromise, harmonicPromise, indicatorsPromise])
		const confluenceData = calculateConfluence({ candles, elliott: elliott.data, gann: gann.data, indicators: indicators.data, harmonic: harmonic.data ?? { status: 'insufficient_data' } })
		const confluence: Engine<Record<string, unknown>> = { available: true, data: confluenceData as unknown as Record<string, unknown>, latency_ms: 0 }
		const recommendationData = buildDecisionSupport(Number(confluenceData.bullish_confluence), candles)
		const recommendation: Engine<Record<string, unknown>> = { available: true, data: recommendationData as unknown as Record<string, unknown>, latency_ms: 0 }
		const engines = [elliott, gann, harmonic, indicators, confluence, recommendation]
		const available = engines.filter((engine) => engine.available).length
		const issues = [...validation.issues, ...engines.filter((engine) => !engine.available).map((engine) => engine.reason ?? 'engine_unavailable')]
		const result: AnalysisResult = { ...base, elliott, gann, harmonic, indicators, confluence, recommendation, integrity: { score: Math.round((available / engines.length) * 100), available_engines: available, total_engines: engines.length, issues }, latency_ms: Date.now() - started }
		cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value: result })
		return result
	}
}
