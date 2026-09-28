import { analyzeSupportResistance, type SRExtendedCandle } from './support-resistance.service.js'

export type FibonacciCandle = SRExtendedCandle
export type FibonacciLevel = { ratio: number; price: number; label: string; strength: number; significance: 'golden_ratio' | 'major' | 'standard' | 'extended' }
export type FibonacciTimeZone = { days: number; date: string; type: 'short' | 'medium' | 'long' }
export type FibonacciOptions = { abc?: { a: number; b: number; c: number }; projection?: { a: number; b: number }; timeZoneBaseIndex?: number }
export type FibonacciAnalysis = {
	available: boolean
	swing_reference: { high: number; low: number; range: number; direction: 'up' | 'down'; high_index: number; low_index: number }
	retracement: Record<string, FibonacciLevel>
	extension: Record<string, FibonacciLevel>
	expansion: Record<string, number>
	projection: Record<string, number>
	time_zones: FibonacciTimeZone[]
	confluence_points: Array<{ price: number; sources: string[]; strength: 'weak' | 'moderate' | 'strong' | 'very_strong'; confidence: number; type: 'support' | 'resistance' }>
	data_quality: { candles: number; minimum_required: number; warnings: string[] }
}

const MINIMUM_CANDLES = 30
const EPS = 1e-9
const RETRACEMENTS = [0.236, 0.382, 0.5, 0.618, 0.786, 0.886, 1]
const EXTENSIONS = [1.272, 1.618, 2, 2.618, 3.618, 4.236]
const TIME_SERIES = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144]
const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const high = (candle: FibonacciCandle) => candle.high ?? candle.close
const low = (candle: FibonacciCandle) => candle.low ?? candle.close
const close = (candle: FibonacciCandle) => candle.close
const label = (ratio: number) => `${(ratio * 100).toFixed(ratio === 1 ? 1 : 1)}%`
const significance = (ratio: number): FibonacciLevel['significance'] => ratio === 0.618 ? 'golden_ratio' : ratio === 0.5 || ratio === 0.382 ? 'major' : ratio <= 1 ? 'standard' : 'extended'
const strength = (ratio: number) => ratio === 0.618 ? 10 : ratio === 0.5 ? 9 : ratio === 0.382 ? 8 : ratio === 0.236 || ratio === 0.786 ? 7 : ratio === 0.886 ? 5 : 6
function makeLevel(ratio: number, price: number): FibonacciLevel { return { ratio, price: round(price), label: label(ratio), strength: strength(ratio), significance: significance(ratio) } }
function swingReference(candles: FibonacciCandle[]) {
	const start = Math.max(0, candles.length - 200), segment = candles.slice(start); const highOffset = segment.reduce((best, item, index) => high(item) > high(segment[best]) ? index : best, 0), lowOffset = segment.reduce((best, item, index) => low(item) < low(segment[best]) ? index : best, 0); const highIndex = start + highOffset, lowIndex = start + lowOffset, top = high(candles[highIndex]), bottom = low(candles[lowIndex]), range = top - bottom
	if (!Number.isFinite(range) || range <= bottom * 0.05) return null
	return { high: top, low: bottom, range, direction: lowIndex < highIndex ? 'up' as const : 'down' as const, high_index: highIndex, low_index: lowIndex }
}
function retracement(reference: NonNullable<ReturnType<typeof swingReference>>) {
	const result: Record<string, FibonacciLevel> = {}; for (const ratio of RETRACEMENTS) { const price = reference.direction === 'up' ? reference.high - reference.range * ratio : reference.low + reference.range * ratio; result[label(ratio)] = makeLevel(ratio, price) } return result
}
function extension(reference: NonNullable<ReturnType<typeof swingReference>>) {
	const result: Record<string, FibonacciLevel> = {}; for (const ratio of EXTENSIONS) { const price = reference.direction === 'up' ? reference.low + reference.range * ratio : reference.high - reference.range * ratio; result[label(ratio)] = makeLevel(ratio, price) } return result
}
function expansion(options: FibonacciOptions | undefined, reference: NonNullable<ReturnType<typeof swingReference>>) {
	const abc = options?.abc ?? { a: reference.low, b: reference.high, c: close({ close: reference.direction === 'up' ? reference.high : reference.low }) }; const result: Record<string, number> = {}; for (const ratio of [1, 1.272, 1.618]) result[ratio.toString()] = round(abc.a + (abc.c - abc.b) * ratio); return result
}
function projection(options: FibonacciOptions | undefined, reference: NonNullable<ReturnType<typeof swingReference>>) {
	const points = options?.projection ?? { a: reference.low, b: reference.high }; const result: Record<string, number> = {}; for (const ratio of [0.618, 1, 1.618]) result[ratio.toString()] = round(points.a + (points.b - points.a) * ratio); return result
}
function timeZones(candles: FibonacciCandle[], baseIndex: number) {
	const base = candles[baseIndex], baseDate = base?.timestamp == null ? new Date(Date.UTC(2026, 0, 1 + baseIndex)) : new Date(base.timestamp); return TIME_SERIES.map(days => { const target = new Date(baseDate.getTime()); target.setUTCDate(target.getUTCDate() + days); return { days, date: target.toISOString().slice(0, 10), type: days <= 21 ? 'short' as const : days <= 55 ? 'medium' as const : 'long' as const } })
}
function confluence(candles: FibonacciCandle[], retracements: Record<string, FibonacciLevel>, extensions: Record<string, FibonacciLevel>, projections: Record<string, number>) {
	const sr = analyzeSupportResistance(candles), candidates: Array<{ price: number; source: string; type: 'support' | 'resistance' }> = []; for (const [key, value] of Object.entries(retracements)) candidates.push({ price: value.price, source: `fib_${key}`, type: value.price <= close(candles.at(-1)!) ? 'support' : 'resistance' }); for (const [key, value] of Object.entries(extensions)) candidates.push({ price: value.price, source: `fib_extension_${key}`, type: value.price <= close(candles.at(-1)!) ? 'support' : 'resistance' }); for (const [key, value] of Object.entries(projections)) candidates.push({ price: value, source: `fib_projection_${key}`, type: value <= close(candles.at(-1)!) ? 'support' : 'resistance' }); for (const level of sr.levels) candidates.push({ price: level.level, source: `support_resistance_${level.sources[0]}`, type: level.type })
	const result: FibonacciAnalysis['confluence_points'] = []; for (const candidate of candidates) { const nearby = candidates.filter(other => other.type === candidate.type && Math.abs(other.price - candidate.price) / Math.max(candidate.price, EPS) < 0.005); const sources = [...new Set(nearby.map(item => item.source))]; if (sources.length < 3 || result.some(item => Math.abs(item.price - candidate.price) / Math.max(candidate.price, EPS) < 0.005)) continue; const confidence = Math.min(0.99, 0.55 + sources.length * 0.1); result.push({ price: round(nearby.reduce((sum, item) => sum + item.price, 0) / nearby.length), sources, strength: sources.length >= 4 ? 'very_strong' : sources.length === 3 ? 'strong' : 'moderate', confidence: round(confidence, 2), type: candidate.type }) }
	return result.slice(0, 10)
}

export function analyzeFibonacci(candles: FibonacciCandle[], options?: FibonacciOptions): FibonacciAnalysis {
	const emptyReference = { high: 0, low: 0, range: 0, direction: 'up' as const, high_index: 0, low_index: 0 }
	if (candles.length < MINIMUM_CANDLES) return { available: false, swing_reference: emptyReference, retracement: {}, extension: {}, expansion: {}, projection: {}, time_zones: [], confluence_points: [], data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: ['At least 30 candles are required for Fibonacci analysis.'] } }
	const reference = swingReference(candles); if (!reference) return { available: false, swing_reference: emptyReference, retracement: {}, extension: {}, expansion: {}, projection: {}, time_zones: [], confluence_points: [], data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: ['No swing with at least 5% movement was found.'] } }
	const retr = retracement(reference), ext = extension(reference), exp = expansion(options, reference), proj = projection(options, reference), baseIndex = options?.timeZoneBaseIndex ?? Math.max(reference.high_index, reference.low_index), zones = timeZones(candles, Math.min(candles.length - 1, Math.max(0, baseIndex)))
	return { available: true, swing_reference: { ...reference, high: round(reference.high), low: round(reference.low), range: round(reference.range) }, retracement: retr, extension: ext, expansion: exp, projection: proj, time_zones: zones, confluence_points: confluence(candles, retr, ext, proj), data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: candles.some(candle => candle.volume == null) ? ['Some candles lack volume; Support/Resistance confluence is conservative.'] : [] } }
}

export const fibonacciMetadata = { retracementRatios: RETRACEMENTS, extensionRatios: EXTENSIONS, expansionRatios: [1, 1.272, 1.618], projectionRatios: [0.618, 1, 1.618], timeSeries: TIME_SERIES, minimumCandles: MINIMUM_CANDLES }
