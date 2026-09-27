import type { Candle } from './indicators.service.js'

export type VSACandle = Candle & { timestamp?: string | number }
export type VSASignal = 'bullish' | 'bearish' | 'neutral'
export type VSAPatternCode = 'no_demand' | 'no_supply' | 'stopping_volume' | 'selling_climax' | 'buying_climax' | 'upthrust' | 'shakeout' | 'test_bar' | 'effort_to_rise' | 'effort_to_fall' | 'absorption' | 'reverse_upthrust'
export type VSAResult = {
	available: boolean
	patterns: VSAPattern[]
	volume_character: 'accumulation' | 'distribution' | 'balanced' | 'insufficient_data'
	supply_demand_balance: { buyers: number; sellers: number; dominant: 'buyers' | 'sellers' | 'balanced' }
	recent_bars: VSABarAnalysis[]
	alerts: string[]
	data_quality: { candles: number; minimum_required: number; warnings: string[] }
}
export type VSAPattern = {
	pattern: VSAPatternCode
	date: string
	signal: VSASignal
	strength: number
	description: string
	index: number
}
export type VSABarAnalysis = {
	date: string
	index: number
	spread: number
	spread_ratio: number
	volume_ratio: number
	close_position: number
	spread_character: 'wide' | 'normal' | 'narrow'
	volume_character: 'very_high' | 'high' | 'moderate' | 'low' | 'very_low'
	close_character: 'strong' | 'middle' | 'weak'
	pattern: VSAPatternCode | null
	signal: VSASignal
}

const MINIMUM_CANDLES = 10
const EPS = 1e-9
const close = (candle: VSACandle) => candle.close
const high = (candle: VSACandle) => candle.high ?? candle.close
const low = (candle: VSACandle) => candle.low ?? candle.close
const volume = (candle: VSACandle) => candle.volume ?? 0
const average = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
const round = (value: number, digits = 4) => Number(value.toFixed(digits))
const date = (candle: VSACandle, index: number) => candle.timestamp == null ? String(index) : new Date(candle.timestamp).toISOString().slice(0, 10)
const spreadOf = (candle: VSACandle) => Math.max(0, high(candle) - low(candle))

function volumeCharacter(ratio: number): VSABarAnalysis['volume_character'] {
	return ratio > 2 ? 'very_high' : ratio >= 1.5 ? 'high' : ratio >= 0.7 ? 'moderate' : ratio >= 0.5 ? 'low' : 'very_low'
}
function spreadCharacter(ratio: number): VSABarAnalysis['spread_character'] {
	return ratio > 1.5 ? 'wide' : ratio < 0.7 ? 'narrow' : 'normal'
}
function closeCharacter(position: number): VSABarAnalysis['close_character'] {
	return position > 0.7 ? 'strong' : position < 0.3 ? 'weak' : 'middle'
}
function signalFor(pattern: VSAPatternCode | null): VSASignal {
	if (pattern === 'no_supply' || pattern === 'stopping_volume' || pattern === 'selling_climax' || pattern === 'shakeout' || pattern === 'test_bar' || pattern === 'reverse_upthrust' || pattern === 'effort_to_rise') return 'bullish'
	if (pattern === 'no_demand' || pattern === 'buying_climax' || pattern === 'upthrust' || pattern === 'effort_to_fall') return 'bearish'
	return 'neutral'
}
function strengthFor(volumeRatio: number, spreadRatio: number, pattern: VSAPatternCode) {
	const base = pattern === 'selling_climax' || pattern === 'buying_climax' || pattern === 'shakeout' || pattern === 'upthrust' ? 0.68 : 0.5
	return round(Math.min(0.98, base + Math.max(0, volumeRatio - 1) * 0.1 + Math.max(0, spreadRatio - 1) * 0.06), 2)
}
function priorTrend(candles: VSACandle[], index: number, window = 4) {
	if (index <= window) return 'flat' as const
	const change = close(candles[index - 1]) - close(candles[index - 1 - window])
	return change > 0 ? 'up' as const : change < 0 ? 'down' as const : 'flat' as const
}
function previousAverage(candles: VSACandle[], index: number, window: number) {
	const start = Math.max(0, index - window)
	return { spreads: candles.slice(start, index).map(spreadOf), volumes: candles.slice(start, index).map(volume) }
}
function recentLow(candles: VSACandle[], index: number, window: number) {
	return Math.min(...candles.slice(Math.max(0, index - window), index).map(low))
}
function recentHigh(candles: VSACandle[], index: number, window: number) {
	return Math.max(...candles.slice(Math.max(0, index - window), index).map(high))
}
function patternDescription(pattern: VSAPatternCode): string {
	const descriptions: Record<VSAPatternCode, string> = {
		no_demand: 'شمعة صاعدة بحجم منخفض ونطاق ضيق — الطلب غير مؤكد',
		no_supply: 'شمعة هابطة بحجم منخفض ونطاق ضيق — لا يوجد ضغط بيع واضح',
		stopping_volume: 'هبوط مع حجم مرتفع وإغلاق علوي — امتصاص محتمل للبيع',
		selling_climax: 'هبوط واسع قرب قاع جديد مع حجم مرتفع جداً — احتمال انعكاس',
		buying_climax: 'صعود واسع قرب قمة جديدة مع حجم مرتفع جداً — احتمال تصريف',
		upthrust: 'اختراق علوي فاشل وإغلاق ضعيف مع حجم مرتفع — عرض محتمل',
		shakeout: 'كسر سفلي مع عودة وإغلاق قوي — طلب محتمل',
		test_bar: 'إعادة اختبار بحجم منخفض دون كسر جديد — تأكيد مشروط',
		effort_to_rise: 'نطاق واسع صاعد مع حجم مرتفع — جهد صعود مؤكد نسبياً',
		effort_to_fall: 'نطاق واسع هابط مع حجم مرتفع — جهد هبوط مؤكد نسبياً',
		absorption: 'حجم مرتفع مع نطاق ضيق وإغلاق متوسط — امتصاص محتمل',
		reverse_upthrust: 'رفض سفلي مع إغلاق قوي — عكس نمط Upthrust',
	}
	return descriptions[pattern]
}

export function analyzeVsaBar(candles: VSACandle[], index: number, lookback = 20): VSABarAnalysis | null {
	if (index < 1 || index >= candles.length) return null
	const candle = candles[index]
	const currentSpread = spreadOf(candle)
	const prior = previousAverage(candles, index, lookback)
	const averageSpread = average(prior.spreads)
	const averageVolume = average(prior.volumes)
	if (averageSpread <= EPS || averageVolume <= EPS) return null
	const spreadRatio = currentSpread / averageSpread
	const volumeRatio = volume(candle) / averageVolume
	const closePosition = currentSpread <= EPS ? 0.5 : Math.max(0, Math.min(1, (close(candle) - low(candle)) / currentSpread))
	const trend = priorTrend(candles, index)
	const lowBoundary = recentLow(candles, index, Math.min(lookback, 10))
	const highBoundary = recentHigh(candles, index, Math.min(lookback, 10))
	const downBar = close(candle) < close(candles[index - 1])
	const upBar = close(candle) > close(candles[index - 1])
	const newLow = low(candle) < lowBoundary
	const newHigh = high(candle) > highBoundary
	let pattern: VSAPatternCode | null = null
	if (upBar && volumeRatio < 0.7 && spreadRatio < 0.7) pattern = 'no_demand'
	else if (downBar && volumeRatio < 0.7 && spreadRatio < 0.7) pattern = 'no_supply'
	else if (downBar && trend === 'down' && volumeRatio > 2 && closePosition > 0.7) pattern = 'stopping_volume'
	else if (downBar && trend === 'down' && spreadRatio > 1.5 && volumeRatio > 2 && newLow) pattern = 'selling_climax'
	else if (upBar && trend === 'up' && spreadRatio > 1.5 && volumeRatio > 2 && newHigh) pattern = 'buying_climax'
	else if (newHigh && closePosition < 0.3 && volumeRatio >= 1.5) pattern = 'upthrust'
	else if (newLow && closePosition > 0.7 && volumeRatio >= 1.5) pattern = 'shakeout'
	else if (!newLow && !newHigh && volumeRatio < 0.5 && (low(candle) <= lowBoundary + averageSpread * 0.25 || high(candle) >= highBoundary - averageSpread * 0.25)) pattern = 'test_bar'
	else if (upBar && spreadRatio > 1.5 && volumeRatio >= 1.5) pattern = 'effort_to_rise'
	else if (downBar && spreadRatio > 1.5 && volumeRatio >= 1.5) pattern = 'effort_to_fall'
	else if (volumeRatio >= 1.5 && spreadRatio < 0.7 && closePosition >= 0.3 && closePosition <= 0.7) pattern = 'absorption'
	else if (newLow && closePosition > 0.7 && volumeRatio >= 1.2) pattern = 'reverse_upthrust'
	return {
		date: date(candle, index), index, spread: round(currentSpread), spread_ratio: round(spreadRatio), volume_ratio: round(volumeRatio), close_position: round(closePosition), spread_character: spreadCharacter(spreadRatio), volume_character: volumeCharacter(volumeRatio), close_character: closeCharacter(closePosition), pattern, signal: signalFor(pattern),
	}
}

export function analyzeVsa(candles: VSACandle[], options: { lookback?: number; recentBars?: number } = {}): VSAResult {
	const lookback = Math.max(5, options.lookback ?? 20)
	const recentBarsCount = Math.max(1, options.recentBars ?? 10)
	if (candles.length < MINIMUM_CANDLES) return { available: false, patterns: [], volume_character: 'insufficient_data', supply_demand_balance: { buyers: 50, sellers: 50, dominant: 'balanced' }, recent_bars: [], alerts: [], data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: ['At least 10 candles are required for VSA analysis.'] } }
	const bars = candles.map((_, index) => analyzeVsaBar(candles, index, lookback)).filter((bar): bar is VSABarAnalysis => bar != null)
	const recent = bars.slice(-recentBarsCount)
	const patterns: VSAPattern[] = recent.filter(bar => bar.pattern != null).map(bar => ({ pattern: bar.pattern!, date: bar.date, signal: bar.signal, strength: strengthFor(bar.volume_ratio, bar.spread_ratio, bar.pattern!), description: patternDescription(bar.pattern!), index: bar.index }))
	const bullish = bars.filter(bar => bar.signal === 'bullish').length
	const bearish = bars.filter(bar => bar.signal === 'bearish').length
	const totalSignals = Math.max(1, bullish + bearish)
	const buyers = Math.round((bullish / totalSignals) * 100)
	const sellers = 100 - buyers
	const dominant = buyers > sellers + 5 ? 'buyers' : sellers > buyers + 5 ? 'sellers' : 'balanced'
	const bullishPatterns = patterns.filter(pattern => pattern.signal === 'bullish').length
	const bearishPatterns = patterns.filter(pattern => pattern.signal === 'bearish').length
	const volumeCharacter = bullishPatterns > bearishPatterns + 1 ? 'accumulation' : bearishPatterns > bullishPatterns + 1 ? 'distribution' : 'balanced'
	const alerts: string[] = []
	for (const [pattern, label] of [['no_supply', 'No Supply'], ['no_demand', 'No Demand'], ['stopping_volume', 'Stopping Volume']] as const) {
		const count = recent.filter(bar => bar.pattern === pattern).length
		if (count >= 3) alerts.push(`${count} شموع ${label} خلال آخر ${recentBarsCount} أيام`)
	}
	if (patterns.some(pattern => pattern.pattern === 'selling_climax')) alerts.push('تم رصد Selling Climax؛ يلزم تأكيد لاحق قبل اعتبار الانعكاس')
	if (patterns.some(pattern => pattern.pattern === 'buying_climax')) alerts.push('تم رصد Buying Climax؛ راقب ضعف الطلب بعد القمة')
	return { available: true, patterns, volume_character: volumeCharacter, supply_demand_balance: { buyers, sellers, dominant }, recent_bars: recent, alerts, data_quality: { candles: candles.length, minimum_required: MINIMUM_CANDLES, warnings: candles.some(candle => candle.volume == null) ? ['Some candles lack volume; relative volume is calculated conservatively.'] : [] } }
}

export const vsaMetadata = {
	patterns: ['no_demand', 'no_supply', 'stopping_volume', 'selling_climax', 'buying_climax', 'upthrust', 'shakeout', 'test_bar', 'effort_to_rise', 'effort_to_fall', 'absorption', 'reverse_upthrust'] as const,	minimumCandles: MINIMUM_CANDLES,
	volumeRules: { very_high: '>2x', high: '1.5-2x', moderate: '0.7-1.5x', low: '0.5-0.7x', very_low: '<0.5x' },
	spreadRules: { wide: '>1.5x', normal: '0.7-1.5x', narrow: '<0.7x' },
}
