import type { Candle } from './indicators.service.js'

export type SRExtendedCandle = Candle & { timestamp?: string | number }
export type SRType = 'support' | 'resistance'
export type SRSource = 'swing_high' | 'swing_low' | 'volume_profile_poc' | 'volume_profile_vah' | 'volume_profile_val' | 'fibonacci_23.6' | 'fibonacci_38.2' | 'fibonacci_50' | 'fibonacci_61.8' | 'fibonacci_78.6' | 'gann_1x1' | 'gann_2x1' | 'gann_1x2' | 'psychological' | 'pdh' | 'pdl' | 'pwh' | 'pwl' | 'pmh' | 'pml' | 'gap'

export type SupportResistanceLevel = {
	level: number
	type: SRType
	strength: number
	touches: number
	bounce_rate: number
	break_rate: number
	sources: SRSource[]
	timeframes: ('daily' | 'weekly' | 'monthly')[]
	last_reaction: string
	distance_from_current: number
	age_days: number
	priority: number
}
export type SupportResistanceAnalysis = {
	available: boolean
	levels: SupportResistanceLevel[]
	nearest_resistance: SupportResistanceLevel | null
	nearest_support: SupportResistanceLevel | null
	top_resistances: Array<Pick<SupportResistanceLevel, 'level' | 'strength' | 'sources' | 'touches'>>
	top_supports: Array<Pick<SupportResistanceLevel, 'level' | 'strength' | 'sources' | 'touches'>>
	zone_analysis: { current_zone: 'below_range' | 'near_support' | 'mid_range' | 'near_resistance' | 'above_range'; position_in_range: number; range_high: number | null; range_low: number | null }
	data_quality: { candles: number; minimum_required: number; warnings: string[] }
}

type Candidate = { price: number; type: SRType; source: SRSource; timeframe: 'daily' | 'weekly' | 'monthly'; index: number }
const MINIMUM_CANDLES = 30
const EPS = 1e-9
const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const high = (candle: SRExtendedCandle) => candle.high ?? candle.close
const low = (candle: SRExtendedCandle) => candle.low ?? candle.close
const close = (candle: SRExtendedCandle) => candle.close
const open = (candle: SRExtendedCandle) => candle.open ?? candle.close
const volume = (candle: SRExtendedCandle) => candle.volume ?? 0
const date = (candle: SRExtendedCandle, index: number) => candle.timestamp == null ? String(index) : new Date(candle.timestamp).toISOString().slice(0, 10)
const pct = (value: number, reference: number) => Math.abs(value - reference) / Math.max(Math.abs(reference), EPS)
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const timeframeFor = (source: SRSource): 'daily' | 'weekly' | 'monthly' => source.startsWith('pwh') || source.startsWith('pwl') ? 'weekly' : source.startsWith('pmh') || source.startsWith('pml') ? 'monthly' : 'daily'

function addCandidate(candidates: Candidate[], price: number, type: SRType, source: SRSource, index: number, timeframe = timeframeFor(source)) { if (Number.isFinite(price) && price > 0) candidates.push({ price, type, source, index, timeframe }) }
function localExtrema(candles: SRExtendedCandle[], lookback: number, type: SRType) {
	const result: Array<{ price: number; index: number }> = []
	for (let i = lookback; i < candles.length - lookback; i++) {
		const value = type === 'resistance' ? high(candles[i]) : low(candles[i]); const neighbors = candles.slice(i - lookback, i + lookback + 1).map(item => type === 'resistance' ? high(item) : low(item)); const extreme = type === 'resistance' ? value >= Math.max(...neighbors) : value <= Math.min(...neighbors)
		if (extreme) result.push({ price: value, index: i })
	}
	return result
}
function addSwingCandidates(candles: SRExtendedCandle[], candidates: Candidate[]) { for (const lookback of [5, 10, 20]) { for (const item of localExtrema(candles, lookback, 'resistance')) addCandidate(candidates, item.price, 'resistance', 'swing_high', item.index); for (const item of localExtrema(candles, lookback, 'support')) addCandidate(candidates, item.price, 'support', 'swing_low', item.index) } }
function addVolumeProfile(candles: SRExtendedCandle[], candidates: Candidate[]) {
	const prices = candles.map(close), min = Math.min(...prices), max = Math.max(...prices), bins = 24, width = Math.max((max - min) / bins, max * 0.001); if (max <= min) return
	const histogram = Array.from({ length: bins }, () => 0); for (const candle of candles) histogram[Math.min(bins - 1, Math.max(0, Math.floor((close(candle) - min) / width)))] += volume(candle)
	const total = histogram.reduce((a, b) => a + b, 0), poc = histogram.indexOf(Math.max(...histogram)); let left = poc, right = poc, covered = histogram[poc]; while (covered < total * 0.7 && (left > 0 || right < bins - 1)) { const nextLeft = left > 0 ? histogram[left - 1] : -1, nextRight = right < bins - 1 ? histogram[right + 1] : -1; if (nextRight >= nextLeft) { right++; covered += histogram[right] } else { left--; covered += histogram[left] } }
	addCandidate(candidates, min + (poc + 0.5) * width, 'support', 'volume_profile_poc', candles.length - 1); addCandidate(candidates, min + (right + 0.5) * width, 'resistance', 'volume_profile_vah', candles.length - 1); addCandidate(candidates, min + (left + 0.5) * width, 'support', 'volume_profile_val', candles.length - 1)
}
function addFibonacci(candles: SRExtendedCandle[], candidates: Candidate[]) {
	const start = Math.max(0, candles.length - 60), segment = candles.slice(start), highIndex = start + segment.reduce((best, candle, index) => high(candle) > high(candles[best]) ? index : best, 0), lowIndex = start + segment.reduce((best, candle, index) => low(candle) < low(candles[best]) ? index : best, 0); const top = high(candles[highIndex]), bottom = low(candles[lowIndex]), diff = top - bottom; if (diff <= EPS) return
	for (const [ratio, source] of [[0.236, 'fibonacci_23.6'], [0.382, 'fibonacci_38.2'], [0.5, 'fibonacci_50'], [0.618, 'fibonacci_61.8'], [0.786, 'fibonacci_78.6']] as const) { const price = top > bottom ? top - diff * ratio : bottom + diff * ratio; addCandidate(candidates, price, price >= close(candles.at(-1)!) ? 'resistance' : 'support', source, Math.max(highIndex, lowIndex)) }
}
function addGann(candles: SRExtendedCandle[], candidates: Candidate[]) {
	const pivotIndex = candles.slice(-60).reduce((best, candle, index, values) => low(candle) < low(values[best]) ? index : best, 0) + Math.max(0, candles.length - 60), pivot = low(candles[pivotIndex]), slope = Math.max(average(candles.slice(Math.max(0, pivotIndex - 10), pivotIndex + 1).map(item => high(item) - low(item))), pivot * 0.005); for (const [ratio, source] of [[1, 'gann_1x1'], [2, 'gann_2x1'], [0.5, 'gann_1x2']] as const) { const price = pivot + slope * ratio * Math.sqrt(Math.max(1, candles.length - pivotIndex)); addCandidate(candidates, price, price >= close(candles.at(-1)!) ? 'resistance' : 'support', source, pivotIndex) }
}
function addPsychological(candles: SRExtendedCandle[], candidates: Candidate[]) {
	const current = close(candles.at(-1)!); const step = current >= 1000 ? 100 : current >= 100 ? 25 : current >= 10 ? 5 : 1; const base = Math.floor(current / step) * step; for (let offset = -2; offset <= 3; offset++) { const price = base + offset * step; addCandidate(candidates, price, price >= current ? 'resistance' : 'support', 'psychological', candles.length - 1) }
}
function addPeriodLevels(candles: SRExtendedCandle[], candidates: Candidate[]) {
	for (const [period, highSource, lowSource] of [[1, 'pdh', 'pdl'], [5, 'pwh', 'pwl'], [20, 'pmh', 'pml']] as const) { if (candles.length <= period) continue; const previous = candles.slice(Math.max(0, candles.length - period * 2), candles.length - period); addCandidate(candidates, Math.max(...previous.map(high)), 'resistance', highSource, candles.length - period - 1); addCandidate(candidates, Math.min(...previous.map(low)), 'support', lowSource, candles.length - period - 1) }
}
function addGaps(candles: SRExtendedCandle[], candidates: Candidate[]) { for (let i = 1; i < candles.length; i++) { const previousClose = close(candles[i - 1]), currentOpen = open(candles[i]); if (pct(currentOpen, previousClose) >= 0.005) { const gap = currentOpen > previousClose ? currentOpen : previousClose; addCandidate(candidates, gap, gap >= close(candles.at(-1)!) ? 'resistance' : 'support', 'gap', i) } } }

function evaluateCluster(candles: SRExtendedCandle[], cluster: Candidate[], current: number): SupportResistanceLevel {
	const level = average(cluster.map(item => item.price)), tolerance = Math.max(level * 0.005, level * 0.001); let touches = 0, bounces = 0, breaks = 0, lastIndex = 0
	for (let i = 0; i < candles.length; i++) { const touched = pct(close(candles[i]), level) <= tolerance / Math.max(level, EPS) || pct(high(candles[i]), level) <= tolerance / Math.max(level, EPS) || pct(low(candles[i]), level) <= tolerance / Math.max(level, EPS); if (!touched) continue; touches++; lastIndex = i; const next = candles[i + 1]; if (!next) continue; const move = close(next) - close(candles[i]); if (cluster[0].type === 'support') { if (move > tolerance) bounces++; if (close(next) < level - tolerance) breaks++ } else { if (move < -tolerance) bounces++; if (close(next) > level + tolerance) breaks++ } }
	const uniqueSources = [...new Set(cluster.map(item => item.source))], timeframes = [...new Set(cluster.map(item => item.timeframe))], bounceRate = touches ? bounces / touches : 0, breakRate = touches ? breaks / touches : 0, age = Math.max(0, candles.length - 1 - lastIndex), freshness = Math.max(0, 1 - age / Math.max(candles.length, 1)), strength = Math.min(10, Math.max(0, uniqueSources.length + touches * 0.5 + bounceRate * 10 + timeframes.length * 0.5 + freshness))
	return { level: round(level), type: cluster[0].type, strength: round(strength, 1), touches, bounce_rate: round(bounceRate, 2), break_rate: round(breakRate, 2), sources: uniqueSources, timeframes, last_reaction: date(candles[lastIndex], lastIndex), distance_from_current: round(pct(level, current) * 100, 2), age_days: age, priority: 0 }
}
function clusterCandidates(candidates: Candidate[]) { const clusters: Candidate[][] = []; for (const candidate of candidates.sort((a, b) => a.price - b.price)) { const cluster = clusters.find(items => items[0].type === candidate.type && pct(candidate.price, average(items.map(item => item.price))) < 0.005); if (cluster) cluster.push(candidate); else clusters.push([candidate]) } return clusters }
function compact(level: SupportResistanceLevel): Pick<SupportResistanceLevel, 'level' | 'strength' | 'sources' | 'touches'> { return { level: level.level, strength: level.strength, sources: level.sources, touches: level.touches } }

export function analyzeSupportResistance(candles: SRExtendedCandle[]): SupportResistanceAnalysis {
	if (candles.length < MINIMUM_CANDLES) return { available: false, levels: [], nearest_resistance: null, nearest_support: null, top_resistances: [], top_supports: [], zone_analysis: { current_zone: 'mid_range', position_in_range: 0.5, range_high: null, range_low: null }, data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: ['At least 30 candles are required for support and resistance analysis.'] } }
	const candidates: Candidate[] = []; addSwingCandidates(candles, candidates); addVolumeProfile(candles, candidates); addFibonacci(candles, candidates); addGann(candles, candidates); addPsychological(candles, candidates); addPeriodLevels(candles, candidates); addGaps(candles, candidates)
	const levels = clusterCandidates(candidates).map(cluster => evaluateCluster(candles, cluster, close(candles.at(-1)!))).filter(level => level.strength >= 4).sort((a, b) => b.strength - a.strength).map((level, index) => ({ ...level, priority: index + 1 })); const resistances = levels.filter(level => level.type === 'resistance' && level.level >= close(candles.at(-1)!)).sort((a, b) => a.level - b.level); const supports = levels.filter(level => level.type === 'support' && level.level <= close(candles.at(-1)!)).sort((a, b) => b.level - a.level); const topResistances = levels.filter(level => level.type === 'resistance').slice(0, 5), topSupports = levels.filter(level => level.type === 'support').slice(0, 5); const rangeHigh = topResistances.length ? Math.max(...topResistances.map(level => level.level)) : null, rangeLow = topSupports.length ? Math.min(...topSupports.map(level => level.level)) : null, current = close(candles.at(-1)!); let position = 0.5; if (rangeHigh != null && rangeLow != null && rangeHigh > rangeLow) position = Math.max(0, Math.min(1, (current - rangeLow) / (rangeHigh - rangeLow))); const currentZone = rangeHigh != null && current > rangeHigh ? 'above_range' : rangeLow != null && current < rangeLow ? 'below_range' : position <= 0.2 ? 'near_support' : position >= 0.8 ? 'near_resistance' : 'mid_range'
	return { available: true, levels, nearest_resistance: resistances[0] ?? null, nearest_support: supports[0] ?? null, top_resistances: topResistances.map(compact), top_supports: topSupports.map(compact), zone_analysis: { current_zone: currentZone, position_in_range: round(position, 2), range_high: rangeHigh == null ? null : round(rangeHigh), range_low: rangeLow == null ? null : round(rangeLow) }, data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: candles.some(candle => candle.volume == null) ? ['Some candles lack volume; volume profile confidence is conservative.'] : [] } }
}

export const supportResistanceMetadata = { sources: ['swing_highs_lows', 'volume_profile', 'fibonacci', 'gann_angles', 'psychological', 'previous_day', 'previous_week', 'previous_month', 'gaps'] as const, minimumCandles: MINIMUM_CANDLES }
