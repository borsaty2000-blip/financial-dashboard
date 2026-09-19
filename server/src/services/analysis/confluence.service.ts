type Candle = {
	open: number
	high: number
	low: number
	close: number
	volume: number
	date?: string
}

type Pivot = { index: number; price: number; type: 'high' | 'low' }

function pivots(candles: Candle[], lookback = 3): Pivot[] {
	const result: Pivot[] = []
	for (let i = lookback; i < candles.length - lookback; i += 1) {
		const candle = candles[i]
		const window = candles.slice(i - lookback, i + lookback + 1)
		if (candle.high >= Math.max(...window.map((item) => item.high)))
			result.push({ index: i, price: candle.high, type: 'high' })
		if (candle.low <= Math.min(...window.map((item) => item.low)))
			result.push({ index: i, price: candle.low, type: 'low' })
	}
	return result
		.sort((a, b) => a.index - b.index)
		.filter((item, index, all) => index === 0 || item.type !== all[index - 1].type)
}

const ratio = (a: number, b: number) => (Math.abs(b) > 0 ? Math.abs(a / b) : null)
const near = (actual: number | null, expected: number, tolerance = 0.08) =>
	actual != null && Math.abs(actual - expected) <= tolerance

export function analyzeHarmonic(candles: Candle[]) {
	const points = pivots(candles).slice(-5)
	if (points.length < 5)
		return {
			status: 'insufficient_data',
			pattern: null,
			missing: ['confirmed_pivots_xabcd'],
			pivots_count: points.length,
		}
	const [x, a, b, c, d] = points
	const xa = a.price - x.price
	const ab = b.price - a.price
	const bc = c.price - b.price
	const cd = d.price - c.price
	const ratios = {
		AB_XA: ratio(ab, xa),
		BC_AB: ratio(bc, ab),
		CD_BC: ratio(cd, bc),
	}
	const candidates = [
		{ name: 'Gartley', score: Number(near(ratios.AB_XA, 0.618)) + Number(near(ratios.BC_AB, 0.618, 0.25)) + Number(near(ratios.CD_BC, 1.272, 0.35)) },
		{ name: 'Bat', score: Number(near(ratios.AB_XA, 0.5, 0.12)) + Number(near(ratios.BC_AB, 0.5, 0.25)) + Number(near(ratios.CD_BC, 1.618, 0.4)) },
		{ name: 'Butterfly', score: Number(near(ratios.AB_XA, 0.786, 0.12)) + Number(near(ratios.BC_AB, 0.5, 0.25)) + Number(near(ratios.CD_BC, 1.618, 0.4)) },
		{ name: 'ABCD', score: Number(near(ratios.BC_AB, 0.618, 0.25)) + Number(near(ratios.CD_BC, 1, 0.2)) },
	]
	const best = candidates.sort((left, right) => right.score - left.score)[0]
	if (!best || best.score < 2)
		return { status: 'insufficient_data', pattern: null, missing: ['confirmed_fibonacci_relationships'], points: { X: x.price, A: a.price, B: b.price, C: c.price, D: d.price }, fibonacci_ratios: ratios }
	const current = candles.at(-1)?.close ?? d.price
	const direction = d.price > c.price ? 'up' : 'down'
	const stop = direction === 'up' ? Math.min(d.price, c.price) : Math.max(d.price, c.price)
	const range = Math.abs(a.price - x.price)
	return {
		status: 'success',
		pattern: best.name,
		points: { X: x.price, A: a.price, B: b.price, C: c.price, D: d.price },
		PRZ: [Math.min(d.price, d.price + range * 0.03), Math.max(d.price, d.price + range * 0.03)],
		entry_zone: [Math.min(d.price, d.price + range * 0.03), Math.max(d.price, d.price + range * 0.03)],
		stop,
		targets: [0.382, 0.618, 1].map((extension) => Number((d.price + (direction === 'up' ? 1 : -1) * range * extension).toFixed(2))),
		fibonacci_ratios: ratios,
		validation: 'confirmed',
		current_price: current,
	}
}

export function calculateConfluence(input: {
	candles: Candle[]
	elliott: Record<string, unknown> | null
	gann: Record<string, unknown> | null
	indicators: Record<string, unknown> | null
	harmonic: Record<string, unknown>
}) {
	const latest = input.candles.at(-1)
	const previous = input.candles.at(-2)
	const change = latest && previous ? ((latest.close - previous.close) / previous.close) * 100 : null
	const rsi = Number((input.indicators?.rsi as Record<string, unknown> | undefined)?.value)
	const components = {
		trend: { score: change == null ? 5 : change > 0 ? 8 : change < 0 ? 3 : 5, weight: 14 },
		market_structure: { score: input.elliott?.available === false ? 5 : 7, weight: 14 },
		volume: { score: latest?.volume && latest.volume > 0 ? 6 : 5, weight: 10 },
		momentum: { score: Number.isFinite(rsi) ? rsi > 50 && rsi < 70 ? 8 : rsi < 30 ? 7 : 4 : 5, weight: 10 },
		volatility: { score: 5, weight: 5 },
		support_resistance: { score: input.gann ? 7 : 5, weight: 10 },
		fibonacci: { score: input.elliott?.relationships ? 7 : 5, weight: 10 },
		elliott_wave: { score: input.elliott?.available === false ? 5 : 7, weight: 10 },
		gann: { score: input.gann ? 6 : 5, weight: 5 },
		harmonic_pattern: { score: input.harmonic.status === 'success' ? 8 : 5, weight: 4 },
		classical_pattern: { score: 5, weight: 4 },
		divergence: { score: 5, weight: 4 },
	}
	const entries = Object.entries(components)
	const bullish = entries.reduce((sum, [, item]) => sum + (item.score * item.weight) / 10, 0)
	const score = Math.round(Math.max(0, Math.min(100, bullish)))
	return {
		bullish_confluence: score,
		bearish_confluence: 100 - score,
		neutral: score >= 45 && score <= 55 ? 100 : 0,
		components: Object.fromEntries(entries.map(([name, item]) => [name, { ...item, contribution: Number(((item.score * item.weight) / 10).toFixed(2)) }])),
		supporting_evidence: [change != null && change > 0 ? 'السعر الأخير أعلى من الإغلاق السابق' : null, input.harmonic.status === 'success' ? `نموذج ${String(input.harmonic.pattern)} مستوفٍ للنسب` : null].filter(Boolean),
		contradicting_evidence: [Number.isFinite(rsi) && rsi > 70 ? 'RSI في منطقة تشبع شرائي' : null, Number.isFinite(rsi) && rsi < 30 ? 'RSI في منطقة تشبع بيعي' : null].filter(Boolean),
		missing_data: [!latest?.volume ? 'volume' : null, !input.gann ? 'gann' : null, input.harmonic.status !== 'success' ? 'confirmed_harmonic_pattern' : null].filter(Boolean),
		disclaimer: 'درجة توافق الأدلة وليست احتمال ربح أو توصية استثمارية.',
	}
}

export function buildDecisionSupport(score: number, candles: Candle[]) {
	const last = candles.at(-1)?.close ?? null
	const atr = candles.length > 1 ? Math.abs((candles.at(-1)?.high ?? 0) - (candles.at(-1)?.low ?? 0)) : null
	const bullish = score >= 60
	const bearish = score <= 40
	const type = bullish ? 'probable_bullish_setup' : bearish ? 'probable_bearish_setup' : 'no_confirmed_setup'
	const stop = last != null && atr != null ? Number((last + (bullish ? -1 : 1) * atr * 1.5).toFixed(2)) : null
	return {
		recommendation: {
			type,
			condition: bullish ? 'إذا حافظ السعر على آخر دعم مع تأكيد الحجم' : bearish ? 'إذا كسر السعر آخر دعم بإغلاق مؤكد' : 'انتظار إشارة سعرية وحجمية أوضح',
			entry_zone: last == null ? null : [Number((last * 0.995).toFixed(2)), Number((last * 1.005).toFixed(2))],
			stop_loss: stop,
			stop_reason: stop == null ? 'لا توجد شموع كافية' : 'آخر نطاق سعري مع هامش ATR تعليمي',
			targets: last == null || atr == null ? [] : [1, 2, 3].map((multiple) => ({ price: Number((last + (bullish ? 1 : -1) * atr * multiple).toFixed(2)), basis: 'ATR range', rr: multiple })),
			invalidation: stop == null ? 'غير متاح' : `يُبطل السيناريو عند ${stop}`,
			risk_reward: 2,
			validity: 'قصيرة الأجل تعليمية',
		},
		disclaimer: 'Decision Support تعليمي وليس توصية شراء أو بيع.',
	}
}
