import type { Candle } from './indicators.service.js'

export type WyckoffCandle = Candle & { timestamp?: string | number }
export type WyckoffPhase = 'accumulation' | 'markup' | 'distribution' | 'markdown'
export type WyckoffEventCode = 'PS' | 'SC' | 'AR' | 'ST' | 'Spring' | 'Test' | 'SOS' | 'LPS' | 'UT' | 'LPSY'
export type WyckoffPosition = 'below_range' | 'testing_lower_range' | 'middle_range' | 'testing_upper_range' | 'above_range'
export type WyckoffSignal = { type: 'BUY' | 'SELL' | 'NEUTRAL'; strength: 'weak' | 'moderate' | 'strong'; reason: string }

export type WyckoffEvent = {
	event: WyckoffEventCode
	date: string
	price: number
	volume: 'very_low' | 'low' | 'moderate' | 'high' | 'very_high'
	index: number
	significance: 'low' | 'medium' | 'high'
	confirmed: boolean
}

export type WyckoffAnalysis = {
	phase: WyckoffPhase
	confidence: number
	trading_range: { high: number; low: number; duration_days: number }
	current_position: WyckoffPosition
	events_detected: WyckoffEvent[]
	expected_action: 'markup_soon' | 'follow_trend_up' | 'distribution_risk' | 'markdown_soon' | 'wait_for_confirmation'
	target_zone: { min: number; max: number } | null
	signals: WyckoffSignal[]
	data_quality: { candles: number; minimum_required: number; sufficient: boolean; warnings: string[] }
	method: string
}
type WyckoffRange = { high: number; low: number; duration_days?: number }

const MINIMUM_CANDLES = 30
const EPS = 1e-9
const close = (candle: WyckoffCandle) => candle.close
const high = (candle: WyckoffCandle) => candle.high ?? candle.close
const low = (candle: WyckoffCandle) => candle.low ?? candle.close
const volume = (candle: WyckoffCandle) => candle.volume ?? 0
const round = (value: number, digits = 2) => Number(value.toFixed(digits))
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const date = (candle: WyckoffCandle, index: number) => candle.timestamp == null ? String(index) : new Date(candle.timestamp).toISOString().slice(0, 10)

function volumeClass(value: number, averageVolume: number): WyckoffEvent['volume'] {
	if (averageVolume <= EPS) return 'moderate'
	const ratio = value / averageVolume
	return ratio >= 2 ? 'very_high' : ratio >= 1.35 ? 'high' : ratio <= 0.55 ? 'very_low' : ratio <= 0.8 ? 'low' : 'moderate'
}
function event(candles: WyckoffCandle[], index: number, code: WyckoffEventCode, averageVolume: number, significance: WyckoffEvent['significance'] = 'medium', confirmed = true): WyckoffEvent {
	const eventPrice = code === 'Spring' || code === 'SC' || code === 'PS' || code === 'ST' || code === 'Test' ? low(candles[index]) : code === 'UT' || code === 'SOS' || code === 'AR' ? high(candles[index]) : close(candles[index])
	return { event: code, date: date(candles[index], index), price: round(eventPrice), volume: volumeClass(volume(candles[index]), averageVolume), index, significance, confirmed }
}
function localLow(candles: WyckoffCandle[], index: number, radius = 2) {
	const value = low(candles[index])
	return candles.slice(Math.max(0, index - radius), Math.min(candles.length, index + radius + 1)).every((candle, offset) => offset === Math.min(radius, index) || value <= low(candle))
}
function localHigh(candles: WyckoffCandle[], index: number, radius = 2) {
	const value = high(candles[index])
	return candles.slice(Math.max(0, index - radius), Math.min(candles.length, index + radius + 1)).every((candle, offset) => offset === Math.min(radius, index) || value >= high(candle))
}
function trendReturn(candles: WyckoffCandle[], start: number, end: number) {
	const initial = close(candles[start])
	return initial === 0 ? 0 : (close(candles[end]) - initial) / initial
}
function rangeFor(candles: WyckoffCandle[], start: number, end: number) {
	const window = candles.slice(start, end + 1)
	const sortedHighs = window.map(high).sort((a, b) => a - b)
	const sortedLows = window.map(low).sort((a, b) => a - b)
	const upperIndex = Math.max(0, Math.floor((sortedHighs.length - 1) * 0.9))
	const lowerIndex = Math.min(sortedLows.length - 1, Math.ceil((sortedLows.length - 1) * 0.1))
	return { high: sortedHighs[upperIndex], low: sortedLows[lowerIndex], duration_days: window.length }
}
function positionFor(price: number, range: { high: number; low: number }): WyckoffPosition {
	const width = Math.max(range.high - range.low, EPS)
	const ratio = (price - range.low) / width
	return ratio < 0 ? 'below_range' : ratio < 0.25 ? 'testing_lower_range' : ratio > 1 ? 'above_range' : ratio > 0.75 ? 'testing_upper_range' : 'middle_range'
}
function addUnique(events: WyckoffEvent[], candidate: WyckoffEvent | null) {
	if (!candidate || events.some(existing => existing.event === candidate.event)) return
	events.push(candidate)
}

export function detectWyckoffEvents(candles: WyckoffCandle[], range: { high: number; low: number }, startIndex = 0, endIndex = candles.length - 1): WyckoffEvent[] {
	if (candles.length < MINIMUM_CANDLES || endIndex <= startIndex) return []
	const window = candles.slice(startIndex, endIndex + 1)
	const averageVolume = average(window.map(volume))
	const events: WyckoffEvent[] = []
	const rangeWidth = Math.max(range.high - range.low, EPS)
	const lowBreak = range.low - rangeWidth * 0.015
	const highBreak = range.high + rangeWidth * 0.015

	let scIndex = -1
	for (let i = startIndex + 2; i <= endIndex - 2; i++) {
		if (low(candles[i]) <= range.low + rangeWidth * 0.08 && volume(candles[i]) >= averageVolume * 1.35 && localLow(candles, i)) {
			scIndex = i
			addUnique(events, event(candles, i, 'SC', averageVolume, 'high'))
			break
		}
	}
	for (let i = startIndex + 1; i <= endIndex - 2; i++) {
		if (close(candles[i]) < close(candles[i - 1]) && volume(candles[i]) >= averageVolume * 1.5 && low(candles[i]) <= range.low + rangeWidth * 0.15) {
			addUnique(events, event(candles, i, 'PS', averageVolume, 'medium'))
			break
		}
	}
	if (scIndex >= 0) {
		for (let i = scIndex + 1; i <= Math.min(endIndex - 1, scIndex + 8); i++) {
			if (high(candles[i]) >= range.low + rangeWidth * 0.55 && localHigh(candles, i)) {
				addUnique(events, event(candles, i, 'AR', averageVolume, 'high'))
				break
			}
		}
		const ar = events.find(item => item.event === 'AR')
		if (ar) {
			for (let i = ar.index + 1; i <= Math.min(endIndex - 1, ar.index + 12); i++) {
				if (low(candles[i]) <= range.low + rangeWidth * 0.15 && volume(candles[i]) <= averageVolume * 1.05 && localLow(candles, i)) {
					addUnique(events, event(candles, i, 'ST', averageVolume, 'medium'))
					break
				}
			}
		}
	}
	const springStart = Math.max(startIndex + 1, scIndex >= 0 ? scIndex + 1 : startIndex + 1)
	for (let i = springStart; i <= endIndex - 3; i++) {
		if (low(candles[i]) < lowBreak && close(candles[i]) > range.low) {
			const returned = candles.slice(i + 1, Math.min(endIndex + 1, i + 4)).some(candle => close(candle) > range.low)
			if (returned) {
				addUnique(events, event(candles, i, 'Spring', averageVolume, 'high'))
				for (let testIndex = i + 1; testIndex <= Math.min(endIndex, i + 3); testIndex++) {
					if (low(candles[testIndex]) <= range.low + rangeWidth * 0.12 && volume(candles[testIndex]) < volume(candles[i])) { addUnique(events, event(candles, testIndex, 'Test', averageVolume, 'high')); break }
				}
			}
		}
	}
	for (let i = startIndex + 1; i <= endIndex - 3; i++) {
		if (high(candles[i]) > highBreak && close(candles[i]) < range.high) {
			const returned = candles.slice(i + 1, Math.min(endIndex + 1, i + 4)).some(candle => close(candle) < range.high)
			if (returned) addUnique(events, event(candles, i, 'UT', averageVolume, 'high'))
		}
	}
	for (let i = startIndex + 1; i <= endIndex; i++) {
		if (close(candles[i]) > highBreak && volume(candles[i]) >= averageVolume * 1.25) addUnique(events, event(candles, i, 'SOS', averageVolume, 'high'))
	}
	const spring = events.find(item => item.event === 'Spring')
	if (spring) {
		for (let i = spring.index + 1; i <= Math.min(endIndex, spring.index + 8); i++) {
			if (low(candles[i]) > range.low && close(candles[i]) > close(candles[i - 1])) { addUnique(events, event(candles, i, 'LPS', averageVolume, 'medium')); break }
		}
	}
	const ut = events.find(item => item.event === 'UT')
	if (ut) {
		for (let i = ut.index + 1; i <= Math.min(endIndex, ut.index + 8); i++) {
			if (high(candles[i]) < high(candles[ut.index]) && volume(candles[i]) < volume(candles[ut.index])) { addUnique(events, event(candles, i, 'LPSY', averageVolume, 'medium')); break }
		}
	}
	return events.sort((a, b) => a.index - b.index)
}

export function classifyWyckoffPhase(candles: WyckoffCandle[], events: WyckoffEvent[], range: WyckoffRange): WyckoffPhase {
	if (candles.length < MINIMUM_CANDLES) return 'accumulation'
	const start = Math.max(0, candles.length - (range.duration_days ?? candles.length) - 20)
	const priorReturn = trendReturn(candles, start, Math.min(candles.length - 1, start + Math.max(1, Math.floor((candles.length - start) * 0.5))))
	const recentReturn = trendReturn(candles, Math.max(0, candles.length - 15), candles.length - 1)
	const has = (code: WyckoffEventCode) => events.some(eventItem => eventItem.event === code)
	if (has('Spring') && has('Test')) return 'accumulation'
	if (has('UT') && (has('LPSY') || has('ST'))) return 'distribution'
	if (priorReturn < -0.08 && has('SC') && has('AR')) return 'accumulation'
	if (priorReturn > 0.08 && has('UT')) return 'distribution'
	if (recentReturn > 0.06 && close(candles.at(-1)!) > range.high) return 'markup'
	if (recentReturn < -0.06 && close(candles.at(-1)!) < range.low) return 'markdown'
	return recentReturn >= 0 ? 'markup' : 'markdown'
}

export function analyzeWyckoff(candles: WyckoffCandle[], options: { rangePeriod?: number } = {}): WyckoffAnalysis | null {
	const rangePeriod = Math.max(20, options.rangePeriod ?? 45)
	if (candles.length < MINIMUM_CANDLES) return null
	const rangeStart = Math.max(0, candles.length - rangePeriod)
	const range = rangeFor(candles, rangeStart, candles.length - 1)
	const events = detectWyckoffEvents(candles, range, rangeStart, candles.length - 1)
	const phase = classifyWyckoffPhase(candles, events, range)
	const position = positionFor(close(candles.at(-1)!), range)
	const eventCodes = new Set(events.map(item => item.event))
	const evidence = [eventCodes.has('SC'), eventCodes.has('AR'), eventCodes.has('ST'), eventCodes.has('Spring'), eventCodes.has('Test'), eventCodes.has('SOS'), eventCodes.has('UT'), eventCodes.has('LPSY')].filter(Boolean).length
	const confidence = round(Math.min(0.95, 0.42 + evidence * 0.07 + (phase === 'accumulation' && eventCodes.has('Spring') ? 0.08 : 0)))
	const expectedAction = phase === 'accumulation' ? (eventCodes.has('Spring') && eventCodes.has('Test') ? 'markup_soon' : 'wait_for_confirmation') : phase === 'markup' ? 'follow_trend_up' : phase === 'distribution' ? 'distribution_risk' : 'markdown_soon'
	const rangeWidth = range.high - range.low
	const targetZone = phase === 'accumulation' || phase === 'markup' ? { min: round(range.high + rangeWidth * 0.5), max: round(range.high + rangeWidth) } : phase === 'distribution' || phase === 'markdown' ? { min: round(range.low - rangeWidth), max: round(range.low - rangeWidth * 0.5) } : null
	const signals: WyckoffSignal[] = []
	if (eventCodes.has('Spring') && eventCodes.has('Test')) signals.push({ type: 'BUY', strength: 'strong', reason: 'Spring + Test confirmed' })
	else if (eventCodes.has('SOS') && eventCodes.has('LPS')) signals.push({ type: 'BUY', strength: 'strong', reason: 'SOS + LPS confirmed' })
	else if (eventCodes.has('UT') && eventCodes.has('LPSY')) signals.push({ type: 'SELL', strength: 'strong', reason: 'UT + LPSY confirmed' })
	else if (phase === 'markup') signals.push({ type: 'BUY', strength: 'moderate', reason: 'Price is above the trading range after directional expansion' })
	else if (phase === 'markdown') signals.push({ type: 'SELL', strength: 'moderate', reason: 'Price is below the trading range after directional weakness' })
	else signals.push({ type: 'NEUTRAL', strength: 'weak', reason: 'Confirmation events are incomplete' })
	return {
		phase,
		confidence,
		trading_range: { high: round(range.high), low: round(range.low), duration_days: range.duration_days },
		current_position: position,
		events_detected: events,
		expected_action: expectedAction,
		target_zone: targetZone,
		signals,
		data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, sufficient: true, warnings: candles.some(candle => candle.volume == null) ? ['Some candles lack volume; volume classifications are conservative.'] : [] },
		method: 'Wyckoff phase/event rules using price, spread, relative volume, and confirmation windows.',
	}
}

export const wyckoffMetadata = {
	phases: ['accumulation', 'markup', 'distribution', 'markdown'] as const,
	events: ['PS', 'SC', 'AR', 'ST', 'Spring', 'Test', 'SOS', 'LPS', 'UT', 'LPSY'] as const,
	minimumCandles: MINIMUM_CANDLES,
	disclaimer: 'Wyckoff هو توصيف احتمالي لبنية السعر والحجم وليس توصية استثمارية.',
}
