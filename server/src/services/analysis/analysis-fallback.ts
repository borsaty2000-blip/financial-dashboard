type Pivot = {
	index: number
	price: number
	type: 'peak' | 'trough'
}

type Wave = { number: number; from: number; to: number }
type CorrectiveWave = { label: string; from: number; to: number }

const round = (value: number, digits = 6) =>
	Number.isFinite(value) ? Number(value.toFixed(digits)) : value

function orderedPivots(prices: number[], order: number): Pivot[] {
	if (prices.length < order * 2 + 1) return []
	const candidates: Pivot[] = []
	for (let index = 1; index < prices.length - 1; index += 1) {
		const current = prices[index]
		const peak = current > prices[index - 1] && current >= prices[index + 1]
		const trough = current < prices[index - 1] && current <= prices[index + 1]
		if (peak) candidates.push({ index, price: current, type: 'peak' })
		if (trough) candidates.push({ index, price: current, type: 'trough' })
	}
	const selected: Pivot[] = []
	for (const candidate of candidates.sort((a, b) => a.index - b.index)) {
		const previous = selected.at(-1)
		if (previous && candidate.index - previous.index < order) {
			if (candidate.type === previous.type) {
				const stronger =
					candidate.type === 'peak'
						? candidate.price > previous.price
						: candidate.price < previous.price
				if (stronger) selected[selected.length - 1] = candidate
			}
			continue
		}
		selected.push(candidate)
	}
	return selected
}

function waveSize(left: Pivot, right: Pivot) {
	return Math.abs(right.price - left.price)
}

function findImpulsePatterns(pivots: Pivot[]) {
	const patterns: Array<{
		start_index: number
		end_index: number
		direction: 'up' | 'down'
		waves: Wave[]
		validity_score: number
	}> = []
	for (let offset = 0; offset <= Math.max(0, pivots.length - 6); offset += 1) {
		const points = pivots.slice(offset, offset + 6)
		if (points.length < 6) continue
		const types = points.map((point) => point.type).join(',')
		if (
			types !== 'trough,peak,trough,peak,trough,peak' &&
			types !== 'peak,trough,peak,trough,peak,trough'
		)
			continue
		const sizes = points
			.slice(0, 5)
			.map((_, index) => waveSize(points[index], points[index + 1]))
		const upward = points[1].price > points[0].price
		const directionOk = sizes.every((_, index) => {
			const rising = points[index + 1].price > points[index].price
			return (rising === (index % 2 === 0)) === upward
		})
		if (!directionOk || sizes[0] === 0 || sizes[2] === 0) continue
		const wave2Retrace = sizes[1] / sizes[0]
		const wave4Retrace = sizes[3] / sizes[2]
		const wave3NotShortest = sizes[2] >= Math.min(sizes[0], sizes[4])
		const wave4NoOverlap = upward
			? points[4].price > points[1].price
			: points[4].price < points[1].price
		if (
			wave2Retrace < 1 &&
			wave4Retrace < 1 &&
			wave3NotShortest &&
			wave4NoOverlap &&
			sizes[4] >= sizes[2] * 0.618
		) {
			patterns.push({
				start_index: points[0].index,
				end_index: points[5].index,
				direction: upward ? 'up' : 'down',
				waves: sizes.map((_, index) => ({
					number: index + 1,
					from: points[index].price,
					to: points[index + 1].price,
				})),
				validity_score: round(
					Math.min(
						1,
						0.5 + (1 - wave2Retrace) * 0.25 + (1 - wave4Retrace) * 0.25,
					),
					4,
				),
			})
		}
	}
	return patterns
}

function findCorrectivePatterns(pivots: Pivot[]) {
	const patterns: Array<{
		start_index: number
		end_index: number
		direction: 'up' | 'down'
		waves: CorrectiveWave[]
		validity_score: number
	}> = []
	for (let offset = 0; offset <= Math.max(0, pivots.length - 4); offset += 1) {
		const points = pivots.slice(offset, offset + 4)
		if (
			points.length < 4 ||
			new Set(points.map((point) => point.type)).size < 2
		)
			continue
		if (
			points[1].price === points[0].price ||
			points[3].price === points[2].price
		)
			continue
		patterns.push({
			start_index: points[0].index,
			end_index: points[3].index,
			direction: points[1].price < points[0].price ? 'down' : 'up',
			waves: ['A', 'B', 'C'].map((label, index) => ({
				label,
				from: points[index].price,
				to: points[index + 1].price,
			})),
			validity_score: 0.5,
		})
	}
	return patterns
}

function targetsFromPivots(pivots: Pivot[]) {
	const previous = pivots.at(-2)
	const last = pivots.at(-1)
	if (!previous || !last) return {}
	const distance = last.price - previous.price
	return {
		'0.618': round(last.price + distance * 0.618),
		'1.0': round(last.price + distance),
		'1.618': round(last.price + distance * 1.618),
		stop_loss: round(last.price * 0.97),
	}
}

export function analyzeElliottFallback(prices: number[], order = 5) {
	if (prices.length < 3)
		throw new Error('prices must contain at least 3 values')
	const pivots = orderedPivots(prices, Math.max(1, Math.trunc(order)))
	const impulse_patterns = findImpulsePatterns(pivots)
	const corrective_patterns = findCorrectivePatterns(pivots)
	const latestImpulse = impulse_patterns.at(-1)
	const latestCorrective = corrective_patterns.at(-1)
	const current_wave =
		latestImpulse &&
		(!latestCorrective || latestImpulse.end_index >= latestCorrective.end_index)
			? { wave: '5', type: 'impulse', direction: latestImpulse.direction }
			: latestCorrective
				? {
						wave: 'C',
						type: 'corrective',
						direction: latestCorrective.direction,
					}
				: { wave: 'unclear', type: 'unknown', direction: 'unknown' }
	const evidence = impulse_patterns.length + corrective_patterns.length
	return {
		pivots,
		impulse_patterns,
		corrective_patterns,
		current_wave,
		targets: targetsFromPivots(pivots),
		confidence: round(Math.min(0.95, 0.3 + evidence * 0.1), 4),
		engine: 'deterministic-node-fallback',
		disclaimer:
			'تحليل تعليمي احتياطي؛ لا يمثل توصية استثمارية ولا يضمن نتيجة مستقبلية.',
	}
}

export function analyzeGannFallback(prices: number[], dates: string[]) {
	if (!prices.length) throw new Error('prices must not be empty')
	if (prices.length !== dates.length)
		throw new Error('dates must have the same length as prices')
	const low = Math.min(...prices)
	const high = Math.max(...prices)
	const lowIndex = prices.indexOf(low)
	const highIndex = prices.indexOf(high)
	const range = high - low
	const bars = Math.max(1, Math.abs(highIndex - lowIndex))
	const base = Math.sqrt(Math.max((low + high) / 2, 0.000001))
	const cycles = [
		[30, 'Monthly Cycle'],
		[45, '45-Day Cycle'],
		[60, '2-Month Cycle'],
		[90, 'Quarterly Cycle'],
		[120, '4-Month Cycle'],
		[180, 'Semi-Annual Cycle'],
		[270, '9-Month Cycle'],
		[360, 'Annual Cycle'],
	].map(([days, name]) => ({
		days: Number(days),
		name: String(name),
		target_date: new Date(
			new Date(dates[0]).getTime() + Number(days) * 86400000,
		).toISOString(),
	}))
	return {
		high,
		low,
		high_index: highIndex,
		low_index: lowIndex,
		angles: {
			'1x1': { angle: 45, value: high, slope: range / bars },
			'2x1': {
				angle: 63.75,
				value: low + range * 2,
				slope: (range * 2) / bars,
			},
			'1x2': {
				angle: 26.25,
				value: low + range * 0.5,
				slope: (range * 0.5) / bars,
			},
			'4x1': { angle: 75, value: low + range * 4, slope: (range * 4) / bars },
			'1x4': {
				angle: 15,
				value: low + range * 0.25,
				slope: (range * 0.25) / bars,
			},
		},
		square_of_nine: {
			base,
			level_45: (base + 0.125) ** 2,
			level_90: (base + 0.25) ** 2,
			level_180: (base + 0.5) ** 2,
			level_360: (base + 1) ** 2,
			resistance: (base + 0.25) ** 2,
			support: Math.max(0, (base - 0.25) ** 2),
		},
		time_cycles: cycles,
		gann_fan: Object.fromEntries(
			Array.from({ length: 9 }, (_, index) => [
				`level_${index}_8`,
				low + (range * index) / 8,
			]),
		),
		engine: 'deterministic-node-fallback',
		disclaimer:
			'تحليل تعليمي احتياطي؛ لا يمثل توصية استثمارية ولا يضمن نتيجة مستقبلية.',
	}
}
