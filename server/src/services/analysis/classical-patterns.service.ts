import type { Candle } from './indicators.service.js'

export type ClassicalCandle = Candle & { timestamp?: string | number }
export type ClassicalStatus = 'forming' | 'confirmed' | 'failed'
export type ClassicalDirection = 'bullish' | 'bearish' | 'neutral'
export type ClassicalPatternName =
	| 'head_and_shoulders' | 'inverse_head_and_shoulders' | 'double_top' | 'double_bottom' | 'triple_top' | 'triple_bottom' | 'rounding_top' | 'rounding_bottom'
	| 'ascending_triangle' | 'descending_triangle' | 'symmetrical_triangle' | 'bullish_flag' | 'bearish_flag' | 'bullish_pennant' | 'bearish_pennant'
	| 'rectangle' | 'rising_wedge' | 'falling_wedge' | 'cup_and_handle' | 'channel'

export type ClassicalPoint = { price: number; date: string; index: number }
export type ClassicalPattern = {
	name: ClassicalPatternName
	nameAr: string
	status: ClassicalStatus
	direction: ClassicalDirection
	confidence: number
	points: Record<string, ClassicalPoint | number>
	confirmation_level: number
	invalidation_level: number
	target: number | null
	target_calculation: string
	volume_confirmation: boolean
	duration_days: number
	strength: 'weak' | 'moderate' | 'strong'
}
export type ClassicalAnalysis = {
	available: boolean
	patterns: ClassicalPattern[]
	data_quality: { candles: number; minimum_required: number; warnings: string[] }
}

const MINIMUM_CANDLES = 30
const EPS = 1e-9
const high = (c: ClassicalCandle) => c.high ?? c.close
const low = (c: ClassicalCandle) => c.low ?? c.close
const close = (c: ClassicalCandle) => c.close
const volume = (c: ClassicalCandle) => c.volume ?? 0
const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const date = (c: ClassicalCandle, index: number) => c.timestamp == null ? String(index) : new Date(c.timestamp).toISOString().slice(0, 10)
const pctDiff = (a: number, b: number) => Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), EPS)
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const point = (candles: ClassicalCandle[], index: number, price = close(candles[index])) => ({ price: round(price), date: date(candles[index], index), index })

function peaks(candles: ClassicalCandle[], start = 1, end = candles.length - 2, radius = 2) {
	const result: number[] = []
	for (let i = Math.max(start, radius); i <= Math.min(end, candles.length - radius - 1); i++) if (high(candles[i]) >= Math.max(...candles.slice(i - radius, i + radius + 1).map(high))) result.push(i)
	return result
}
function troughs(candles: ClassicalCandle[], start = 1, end = candles.length - 2, radius = 2) {
	const result: number[] = []
	for (let i = Math.max(start, radius); i <= Math.min(end, candles.length - radius - 1); i++) if (low(candles[i]) <= Math.min(...candles.slice(i - radius, i + radius + 1).map(low))) result.push(i)
	return result
}
function range(candles: ClassicalCandle[], start: number, end: number) { return { high: Math.max(...candles.slice(start, end + 1).map(high)), low: Math.min(...candles.slice(start, end + 1).map(low)) } }
function volumeConfirmation(candles: ClassicalCandle[], start: number, end: number) { const before = avg(candles.slice(Math.max(0, start - 10), start).map(volume)); const during = avg(candles.slice(start, end + 1).map(volume)); return before <= EPS || during >= before }
function statusFor(candles: ClassicalCandle[], direction: ClassicalDirection, level: number, invalidation: number): ClassicalStatus {
	const current = close(candles.at(-1)!)
	if (direction === 'bearish' && current < level) return 'confirmed'
	if (direction === 'bullish' && current > level) return 'confirmed'
	if ((direction === 'bearish' && current > invalidation) || (direction === 'bullish' && current < invalidation)) return 'failed'
	return 'forming'
}
function strength(confidence: number): ClassicalPattern['strength'] { return confidence >= 0.78 ? 'strong' : confidence >= 0.62 ? 'moderate' : 'weak' }
function makePattern(candles: ClassicalCandle[], name: ClassicalPatternName, nameAr: string, direction: ClassicalDirection, confidence: number, points: Record<string, ClassicalPoint | number>, confirmation: number, invalidation: number, target: number | null, targetCalculation: string, start: number, end: number): ClassicalPattern {
	return { name, nameAr, status: statusFor(candles, direction, confirmation, invalidation), direction, confidence: round(Math.min(0.98, confidence), 2), points, confirmation_level: round(confirmation), invalidation_level: round(invalidation), target: target == null ? null : round(target), target_calculation: targetCalculation, volume_confirmation: volumeConfirmation(candles, start, end), duration_days: end - start + 1, strength: strength(confidence) }
}
function detectHeadAndShoulders(candles: ClassicalCandle[], inverse = false): ClassicalPattern | null {
	const ps = peaks(candles), ts = troughs(candles)
	if (inverse) {
		const lows = ts
		for (let i = 0; i + 2 < lows.length; i++) { const [l, h, r] = lows.slice(i, i + 3); if (r <= l || candles[h] == null) continue; const lp = low(candles[l]), hp = low(candles[h]), rp = low(candles[r]); if (hp < lp * 0.95 && hp < rp * 0.95 && pctDiff(lp, rp) <= 0.05) { const neckline = Math.max(...candles.slice(l, r + 1).filter((_, j) => j + l !== h).map(high)); const depth = neckline - hp; return makePattern(candles, 'inverse_head_and_shoulders', 'الرأس والكتفين المعكوس', 'bullish', 0.82, { left_shoulder: point(candles, l, lp), head: point(candles, h, hp), right_shoulder: point(candles, r, rp), neckline: round(neckline) }, neckline, hp, neckline + depth, 'Neckline + (Neckline - Head)', l, r) } }
		return null
	}
	for (let i = 0; i + 2 < ps.length; i++) { const [l, h, r] = ps.slice(i, i + 3); const lp = high(candles[l]), hp = high(candles[h]), rp = high(candles[r]); if (hp > lp * 1.05 && hp > rp * 1.05 && pctDiff(lp, rp) <= 0.05) { const neckline = Math.min(...candles.slice(l, r + 1).filter((_, j) => j + l !== h).map(low)); const height = hp - neckline; return makePattern(candles, 'head_and_shoulders', 'الرأس والكتفين', 'bearish', 0.82, { left_shoulder: point(candles, l, lp), head: point(candles, h, hp), right_shoulder: point(candles, r, rp), neckline: round(neckline) }, neckline, hp, neckline - height, 'Neckline - (Head - Neckline)', l, r) } }
	return null
}
function detectDouble(candles: ClassicalCandle[], bottom = false, triple = false): ClassicalPattern | null {
	const indexes = bottom ? troughs(candles) : peaks(candles)
	for (let i = 0; i + (triple ? 2 : 1) < indexes.length; i++) {
		const selected = indexes.slice(i, i + (triple ? 3 : 2)); const prices = selected.map(index => bottom ? low(candles[index]) : high(candles[index])); if (prices.some((price, j) => j > 0 && pctDiff(price, prices[0]) > 0.03)) continue
			const start = selected[0], end = selected.at(-1)!; const between = candles.slice(start, end + 1); const neckline = bottom ? Math.max(...between.map(high)) : Math.min(...between.map(low)); const magnitude = Math.abs(prices[0] - neckline); if (magnitude / Math.max(Math.abs(prices[0]), EPS) < 0.03) continue; const name = bottom ? (triple ? 'triple_bottom' : 'double_bottom') : (triple ? 'triple_top' : 'double_top'); const nameAr = bottom ? (triple ? 'القاع الثلاثي' : 'القاع المزدوج') : (triple ? 'القمة الثلاثية' : 'القمة المزدوجة'); const direction = bottom ? 'bullish' : 'bearish'; return makePattern(candles, name, nameAr, direction, triple ? 0.8 : 0.74, { first: point(candles, start, prices[0]), ...(triple ? { second: point(candles, selected[1], prices[1]), third: point(candles, selected[2], prices[2]) } : { second: point(candles, end, prices[1]) }), neckline: round(neckline) }, neckline, bottom ? prices[0] : prices[0], bottom ? neckline + magnitude : neckline - magnitude, bottom ? 'Neckline + (Neckline - Bottom)' : 'Neckline - (Top - Neckline)', start, end)
	}
	return null
}
function detectRounding(candles: ClassicalCandle[], bottom = false): ClassicalPattern | null {
	if (candles.length < 40) return null
	const start = candles.length - 40, mid = start + 20, end = candles.length - 1; const first = close(candles[start]), middle = close(candles[mid]), lastClose = close(candles[end]); if (bottom ? middle < first * 0.9 && lastClose > middle * 1.08 : middle > first * 1.1 && lastClose < middle * 0.92) { const level = bottom ? Math.max(first, lastClose) : Math.min(first, lastClose); const depth = Math.abs(level - middle); return makePattern(candles, bottom ? 'rounding_bottom' : 'rounding_top', bottom ? 'القاع المستدير' : 'القمة المستديرة', bottom ? 'bullish' : 'bearish', 0.68, { start: point(candles, start), middle: point(candles, mid), end: point(candles, end) }, level, bottom ? middle : middle, bottom ? level + depth : level - depth, bottom ? 'Breakout + Cup Depth' : 'Breakdown - Top Depth', start, end) }
	return null
}
function detectTriangle(candles: ClassicalCandle[], type: 'ascending' | 'descending' | 'symmetrical'): ClassicalPattern | null {
	if (candles.length < 25) return null; const start = candles.length - 25, end = candles.length - 1; const segmentSize = 5; const ph = Array.from({ length: 5 }, (_, segment) => Math.max(...candles.slice(start + segment * segmentSize, start + (segment + 1) * segmentSize).map(high))); const tl = Array.from({ length: 5 }, (_, segment) => Math.min(...candles.slice(start + segment * segmentSize, start + (segment + 1) * segmentSize).map(low))); const highSlope = ph.at(-1)! - ph[0], lowSlope = tl.at(-1)! - tl[0]; const flatHigh = Math.abs(highSlope) <= avg(ph) * 0.03, flatLow = Math.abs(lowSlope) <= avg(tl) * 0.03; if (type === 'ascending' && !(flatHigh && lowSlope > 0)) return null; if (type === 'descending' && !(highSlope < 0 && flatLow)) return null; if (type === 'symmetrical' && !(highSlope < 0 && lowSlope > 0)) return null
	const upper = ph.at(-1)!, lower = tl.at(-1)!, direction: ClassicalDirection = type === 'descending' ? 'bearish' : type === 'ascending' ? 'bullish' : close(candles.at(-1)!) > avg([upper, lower]) ? 'bullish' : 'bearish'; const confirmation = direction === 'bullish' ? upper : lower; const invalidation = direction === 'bullish' ? lower : upper; const width = upper - lower
	return makePattern(candles, `${type}_triangle` as ClassicalPatternName, type === 'ascending' ? 'المثلث الصاعد' : type === 'descending' ? 'المثلث الهابط' : 'المثلث المتماثل', direction, 0.7, { upper: round(upper), lower: round(lower), contacts: 10 }, confirmation, invalidation, direction === 'bullish' ? confirmation + width * 0.75 : confirmation - width * 0.75, 'Breakout ± (Triangle Width × 0.75)', start, end)
}
function detectFlag(candles: ClassicalCandle[], bullish: boolean, pennant: boolean): ClassicalPattern | null {
	if (candles.length < 25) return null; const end = candles.length - 1, poleStart = end - 15, consolidationStart = end - 7; const poleChange = close(candles[poleStart + 8]) - close(candles[poleStart]); const correction = close(candles[end]) - close(candles[consolidationStart]); if (bullish ? poleChange <= 0 || correction >= 0 : poleChange >= 0 || correction <= 0) return null; const box = range(candles, consolidationStart, end); const direction: ClassicalDirection = bullish ? 'bullish' : 'bearish'; const level = bullish ? box.high : box.low; const target = bullish ? level + Math.abs(poleChange) : level - Math.abs(poleChange); return makePattern(candles, `${bullish ? 'bullish' : 'bearish'}_${pennant ? 'pennant' : 'flag'}` as ClassicalPatternName, `${bullish ? 'العلم الصاعد' : 'العلم الهابط'}${pennant ? ' / الراية' : ''}`, direction, pennant ? 0.72 : 0.7, { pole_start: point(candles, poleStart), pole_end: point(candles, poleStart + 8), consolidation_high: round(box.high), consolidation_low: round(box.low) }, level, bullish ? box.low : box.high, target, 'Breakout ± Pole Height', poleStart, end)
}
function detectRectangle(candles: ClassicalCandle[]): ClassicalPattern | null {
		if (candles.length < 20) return null; const start = candles.length - 20, box = range(candles, start, candles.length - 1), width = box.high - box.low; const touches = candles.slice(start).filter(c => high(c) >= box.high - width * 0.1 || low(c) <= box.low + width * 0.1).length; if (touches < 5 || width / Math.max(box.low, EPS) > 0.25 || width / Math.max(box.low, EPS) < 0.03) return null; const current = close(candles.at(-1)!); const direction: ClassicalDirection = current > box.high ? 'bullish' : current < box.low ? 'bearish' : 'neutral'; const level = direction === 'bearish' ? box.low : box.high; return makePattern(candles, 'rectangle', 'المستطيل', direction, 0.65, { high: round(box.high), low: round(box.low) }, level, direction === 'bullish' ? box.low : box.high, direction === 'neutral' ? null : direction === 'bullish' ? box.high + width : box.low - width, 'Breakout ± Rectangle Width', start, candles.length - 1)
}
function detectWedge(candles: ClassicalCandle[], rising: boolean): ClassicalPattern | null {
	if (candles.length < 25) return null; const start = candles.length - 25, ps = peaks(candles, start + 2), ts = troughs(candles, start + 2); if (ps.length < 2 || ts.length < 2) return null; const highSlope = high(candles[ps.at(-1)!]) - high(candles[ps[0]]), lowSlope = low(candles[ts.at(-1)!]) - low(candles[ts[0]]); if (rising ? !(highSlope > 0 && lowSlope > 0 && lowSlope > highSlope) : !(highSlope < 0 && lowSlope < 0 && highSlope < lowSlope)) return null; const direction = rising ? 'bearish' : 'bullish'; const upper = high(candles[ps.at(-1)!]), lower = low(candles[ts.at(-1)!]); return makePattern(candles, rising ? 'rising_wedge' : 'falling_wedge', rising ? 'الوتد الصاعد' : 'الوتد الهابط', direction, 0.68, { upper: round(upper), lower: round(lower) }, rising ? lower : upper, rising ? upper : lower, rising ? lower - (upper - lower) : upper + (upper - lower), 'Breakout ± Wedge Width', start, candles.length - 1)
}
function detectCupHandle(candles: ClassicalCandle[]): ClassicalPattern | null {
	if (candles.length < 45) return null; const start = candles.length - 45, cupEnd = candles.length - 12, cup = candles.slice(start, cupEnd + 1), left = high(cup[0]), bottom = Math.min(...cup.map(low)), rim = Math.max(high(cup[0]), high(cup.at(-1)!)), handle = range(candles, cupEnd + 1, candles.length - 1); if (!(bottom < left * 0.9 && rim > bottom * 1.08 && handle.low > bottom + (rim - bottom) * 0.5)) return null; const depth = rim - bottom; return makePattern(candles, 'cup_and_handle', 'الكوب والعروة', 'bullish', 0.76, { cup_left: point(candles, start, left), cup_bottom: point(candles, start + cup.findIndex(c => low(c) === bottom), bottom), rim: round(rim), handle_high: round(handle.high), handle_low: round(handle.low) }, handle.high, handle.low, handle.high + depth, 'Handle Breakout + Cup Depth', start, candles.length - 1)
}
function detectChannel(candles: ClassicalCandle[]): ClassicalPattern | null {
	if (candles.length < 20) return null; const start = candles.length - 20, first = close(candles[start]), lastClose = close(candles.at(-1)!); const direction: ClassicalDirection = lastClose > first * 1.04 ? 'bullish' : lastClose < first * 0.96 ? 'bearish' : 'neutral'; if (direction === 'neutral') return null; const box = range(candles, start, candles.length - 1), width = box.high - box.low; return makePattern(candles, 'channel', direction === 'bullish' ? 'القناة الصاعدة' : 'القناة الهابطة', direction, 0.63, { start: point(candles, start), end: point(candles, candles.length - 1), high: round(box.high), low: round(box.low) }, direction === 'bullish' ? box.high : box.low, direction === 'bullish' ? box.low : box.high, direction === 'bullish' ? box.high + width : box.low - width, 'Channel Breakout ± Channel Width', start, candles.length - 1)
}

export function analyzeClassicalPatterns(candles: ClassicalCandle[]): ClassicalAnalysis {
	if (candles.length < MINIMUM_CANDLES) return { available: false, patterns: [], data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: ['At least 30 candles are required for classical pattern analysis.'] } }
	const patterns: ClassicalPattern[] = []
	const add = (pattern: ClassicalPattern | null) => { if (pattern && !patterns.some(item => item.name === pattern.name)) patterns.push(pattern) }
	add(detectHeadAndShoulders(candles)); add(detectHeadAndShoulders(candles, true)); add(detectDouble(candles)); add(detectDouble(candles, true)); add(detectDouble(candles, false, true)); add(detectDouble(candles, true, true)); add(detectRounding(candles)); add(detectRounding(candles, true)); add(detectTriangle(candles, 'ascending')); add(detectTriangle(candles, 'descending')); add(detectTriangle(candles, 'symmetrical')); add(detectFlag(candles, true, false)); add(detectFlag(candles, false, false)); add(detectFlag(candles, true, true)); add(detectFlag(candles, false, true)); add(detectRectangle(candles)); add(detectWedge(candles, true)); add(detectWedge(candles, false)); add(detectCupHandle(candles)); add(detectChannel(candles))
	return { available: true, patterns, data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: candles.some(candle => candle.volume == null) ? ['Some candles lack volume; volume confirmation is conservative.'] : [] } }
}

export const classicalPatternMetadata = {
	patterns: ['head_and_shoulders', 'inverse_head_and_shoulders', 'double_top', 'double_bottom', 'triple_top', 'triple_bottom', 'rounding_top', 'rounding_bottom', 'ascending_triangle', 'descending_triangle', 'symmetrical_triangle', 'bullish_flag', 'bearish_flag', 'bullish_pennant', 'bearish_pennant', 'rectangle', 'rising_wedge', 'falling_wedge', 'cup_and_handle', 'channel'] as const,
	minimumCandles: MINIMUM_CANDLES,
}
