import {
	calculateIndicatorSnapshot,
	type Candle,
} from './indicators.service.js'

export const ADVANCED_TIMEFRAMES = [
	'1m',
	'5m',
	'15m',
	'30m',
	'1h',
	'4h',
	'1d',
	'1w',
	'1M',
	'1Y',
] as const

type AdvancedTimeframe = (typeof ADVANCED_TIMEFRAMES)[number]

type Pivot = { index: number; price: number; type: 'high' | 'low' }

type Level = {
	price: number
	type: 'support' | 'resistance'
	timeframe: AdvancedTimeframe
	strength: number
	distance_pct: number
	sources: string[]
}
type RawLevel = Pick<Level, 'price' | 'type' | 'sources'>

const round = (value: number, digits = 4) =>
	Number.isFinite(value) ? Number(value.toFixed(digits)) : null

function aggregate(candles: Candle[], step: number): Candle[] {
	if (step <= 1) return candles
	const result: Candle[] = []
	for (let index = 0; index + step <= candles.length; index += step) {
		const group = candles.slice(index, index + step)
		result.push({
			open: group[0].open,
			high: Math.max(...group.map((item) => item.high ?? item.close)),
			low: Math.min(...group.map((item) => item.low ?? item.close)),
			close: group.at(-1)?.close ?? group[0].close,
			volume: group.reduce((sum, item) => sum + (item.volume ?? 0), 0),
		})
	}
	return result
}

function pivots(candles: Candle[], window = 3): Pivot[] {
	const result: Pivot[] = []
	for (let index = window; index < candles.length - window; index += 1) {
		const high = candles[index].high ?? candles[index].close
		const low = candles[index].low ?? candles[index].close
		const highs = candles
			.slice(index - window, index + window + 1)
			.map((c) => c.high ?? c.close)
		const lows = candles
			.slice(index - window, index + window + 1)
			.map((c) => c.low ?? c.close)
		if (high >= Math.max(...highs))
			result.push({ index, price: high, type: 'high' })
		if (low <= Math.min(...lows))
			result.push({ index, price: low, type: 'low' })
	}
	return result.slice(-12)
}

function structure(candles: Candle[]) {
	const points = pivots(candles)
	const highs = points.filter((point) => point.type === 'high')
	const lows = points.filter((point) => point.type === 'low')
	const lastHigh = highs.at(-1)
	const previousHigh = highs.at(-2)
	const lastLow = lows.at(-1)
	const previousLow = lows.at(-2)
	const higherHigh = Boolean(
		lastHigh && previousHigh && lastHigh.price > previousHigh.price,
	)
	const higherLow = Boolean(
		lastLow && previousLow && lastLow.price > previousLow.price,
	)
	const lowerHigh = Boolean(
		lastHigh && previousHigh && lastHigh.price < previousHigh.price,
	)
	const lowerLow = Boolean(
		lastLow && previousLow && lastLow.price < previousLow.price,
	)
	const trend =
		higherHigh && higherLow
			? 'bullish'
			: lowerHigh && lowerLow
				? 'bearish'
				: 'range'
	const lastClose = candles.at(-1)?.close ?? 0
	const resistance =
		lastHigh?.price ??
		Math.max(...candles.slice(-30).map((c) => c.high ?? c.close))
	const support =
		lastLow?.price ??
		Math.min(...candles.slice(-30).map((c) => c.low ?? c.close))
	return {
		trend,
		labels: [
			...(higherHigh ? ['HH'] : lowerHigh ? ['LH'] : []),
			...(higherLow ? ['HL'] : lowerLow ? ['LL'] : []),
		],
		bos:
			trend === 'bullish' && lastClose > resistance
				? 'bullish_bos'
				: trend === 'bearish' && lastClose < support
					? 'bearish_bos'
					: null,
		choch: trend === 'range' ? 'potential_choch' : null,
		support,
		resistance,
		pivots: points,
	}
}

function volumeAnalysis(candles: Candle[]) {
	const volumes = candles.map((c) => c.volume ?? 0)
	const current = volumes.at(-1) ?? 0
	const average =
		volumes.slice(-20).reduce((sum, value) => sum + value, 0) /
		Math.max(1, Math.min(20, volumes.length))
	const previous = candles.at(-2)?.close ?? candles.at(-1)?.close ?? 0
	const close = candles.at(-1)?.close ?? 0
	const proxy = close >= previous ? 'buyers' : 'sellers'
	const relative = average > 0 ? current / average : null
	return {
		current,
		average_20: round(average, 2),
		relative_volume: relative == null ? null : round(relative, 3),
		classification:
			relative == null
				? 'unavailable'
				: relative >= 1.5
					? 'climax'
					: relative >= 1.1
						? 'above_average'
						: relative <= 0.7
							? 'below_average'
							: 'average',
		buyer_strength:
			relative == null
				? null
				: close >= previous
					? round(Math.min(100, 50 + relative * 15), 1)
					: round(Math.max(0, 50 - relative * 15), 1),
		seller_strength:
			relative == null
				? null
				: close >= previous
					? round(Math.max(0, 50 - relative * 15), 1)
					: round(Math.min(100, 50 + relative * 15), 1),
		dominant_side: proxy,
		method: 'price_volume_proxy',
		is_estimate: true,
	}
}

function levels(
	candles: Candle[],
	timeframe: AdvancedTimeframe,
	indicators: ReturnType<typeof calculateIndicatorSnapshot>,
	marketStructure: ReturnType<typeof structure>,
): Level[] {
	const close = candles.at(-1)?.close ?? 0
	const atr = indicators.atr ?? Math.abs(close * 0.02)
	const values: RawLevel[] = [
		{
			price: marketStructure.support,
			type: 'support',
			sources: ['swing_low', 'market_structure'],
		},
		{
			price: marketStructure.resistance,
			type: 'resistance',
			sources: ['swing_high', 'market_structure'],
		},
	]
	if (indicators.sma20 != null)
		values.push({
			price: indicators.sma20,
			type: indicators.sma20 <= close ? 'support' : 'resistance',
			sources: ['SMA20'],
		})
	if (indicators.fibonacci?.dynamicSupport?.level != null)
		values.push({
			price: indicators.fibonacci.dynamicSupport.level,
			type: 'support',
			sources: ['Fibonacci', 'ATR dynamic zone'],
		})
	if (indicators.fibonacci?.dynamicResistance?.level != null)
		values.push({
			price: indicators.fibonacci.dynamicResistance.level,
			type: 'resistance',
			sources: ['Fibonacci', 'ATR dynamic zone'],
		})
	return values
		.filter((level) => Number.isFinite(level.price) && level.price > 0)
		.map((level) => ({
			...level,
			timeframe,
			strength: Math.max(
				1,
				Math.min(
					10,
					Math.round(
						10 - Math.abs(level.price - close) / Math.max(atr, 0.0001),
					),
				),
			),
			distance_pct:
				round((Math.abs(level.price - close) / close) * 100, 2) ?? 0,
		}))
		.sort((a, b) => a.distance_pct - b.distance_pct)
		.slice(0, 5)
}

function scoreFrame(
	candles: Candle[],
	indicators: ReturnType<typeof calculateIndicatorSnapshot>,
	marketStructure: ReturnType<typeof structure>,
	volume: ReturnType<typeof volumeAnalysis>,
) {
	const close = candles.at(-1)?.close ?? 0
	const rsi = indicators.rsi.value
	const macd = indicators.macd.signal
	const trendScore =
		marketStructure.trend === 'bullish'
			? 8
			: marketStructure.trend === 'bearish'
				? 2
				: 5
	const momentumScore =
		rsi == null
			? 5
			: rsi >= 50 && rsi < 70
				? 8
				: rsi > 70
					? 4
					: rsi < 30
						? 6
						: 5
	const volumeScore =
		volume.relative_volume == null
			? 5
			: volume.dominant_side === 'buyers'
				? 7
				: 3
	const indicatorScore = macd === 'bullish' ? 7 : macd === 'bearish' ? 3 : 5
	const components = {
		trend: { score: trendScore, weight: 15 },
		market_structure: { score: trendScore, weight: 15 },
		volume: { score: volumeScore, weight: 10 },
		momentum: { score: momentumScore, weight: 10 },
		indicator_alignment: { score: indicatorScore, weight: 5 },
		volatility: { score: indicators.atr == null ? 5 : 6, weight: 5 },
		support_resistance: {
			score:
				close >= marketStructure.support && close <= marketStructure.resistance
					? 6
					: 4,
			weight: 10,
		},
		fibonacci: { score: indicators.fibonacci ? 6 : 5, weight: 10 },
		elliott: { score: 5, weight: 10 },
		gann: { score: 5, weight: 5 },
		harmonic: { score: 5, weight: 5 },
		classical_pattern: { score: 5, weight: 5 },
		divergence: { score: 5, weight: 5 },
	}
	const totalWeight = Object.values(components).reduce(
		(sum, item) => sum + item.weight,
		0,
	)
	const bullish =
		(Object.values(components).reduce(
			(sum, item) => sum + (item.score / 10) * item.weight,
			0,
		) /
			totalWeight) *
		100
	const bearish = 100 - bullish
	return {
		bullish_confluence: round(bullish, 1),
		bearish_confluence: round(bearish, 1),
		components,
		signal:
			bullish >= 70
				? 'STRONG_BULLISH'
				: bullish >= 58
					? 'BULLISH'
					: bullish <= 30
						? 'STRONG_BEARISH'
						: bullish <= 42
							? 'BEARISH'
							: 'NEUTRAL',
	}
}

function frame(candles: Candle[], timeframe: AdvancedTimeframe) {
	const indicators = calculateIndicatorSnapshot(timeframe, candles)
	const marketStructure = structure(candles)
	const volume = volumeAnalysis(candles)
	const close = candles.at(-1)?.close ?? 0
	const atr = indicators.atr ?? Math.abs(close * 0.02)
	const score = scoreFrame(candles, indicators, marketStructure, volume)
	const bullish = (score.bullish_confluence ?? 50) >= 50
	const sign = bullish ? 1 : -1
	const targetBase = bullish
		? marketStructure.resistance
		: marketStructure.support
	const target1 = targetBase || close + sign * atr
	const target2 = close + sign * atr * 2
	const target3 = close + sign * atr * 3
	const stop = bullish
		? marketStructure.support - atr * 0.5
		: marketStructure.resistance + atr * 0.5
	return {
		available: true,
		timeframe,
		price: close,
		trend: marketStructure.trend,
		secondary_trend: indicators.trendAngle?.direction ?? 'unavailable',
		market_structure: marketStructure,
		momentum: { rsi: indicators.rsi, macd: indicators.macd },
		volatility: {
			atr,
			expected_range: [round(close - atr), round(close + atr)],
			regime:
				atr / close > 0.04 ? 'high' : atr / close < 0.015 ? 'low' : 'normal',
		},
		volume,
		levels: levels(candles, timeframe, indicators, marketStructure),
		indicators,
		confluence: score,
		entry_zone: [
			round(Math.min(close, targetBase || close)),
			round(Math.max(close, targetBase || close)),
		],
		stop_loss: { price: round(stop), method: 'swing structure + ATR buffer' },
		targets: [
			{
				target_price: round(target1),
				method: 'nearest swing support/resistance',
				timeframe,
				distance_pct: round((Math.abs(target1 - close) / close) * 100, 2),
			},
			{
				target_price: round(target2),
				method: 'ATR 2x projection',
				timeframe,
				distance_pct: round((Math.abs(target2 - close) / close) * 100, 2),
			},
			{
				target_price: round(target3),
				method: 'ATR 3x projection',
				timeframe,
				distance_pct: round((Math.abs(target3 - close) / close) * 100, 2),
			},
		],
		scenarios: {
			primary: {
				condition: `إذا ${bullish ? 'ثبت السعر فوق المقاومة/المحور' : 'كسر الدعم بإغلاق مؤكد'}`,
				outcome: bullish
					? 'استهداف المستويات الأعلى'
					: 'استمرار الضغط نحو الدعم التالي',
			},
			alternative: {
				condition: `إذا فشل السيناريو عند ${round(targetBase)}`,
				outcome: bullish ? 'العودة إلى نطاق التذبذب' : 'ارتداد تصحيحي محدود',
			},
			invalidation: {
				level: round(
					bullish ? marketStructure.support : marketStructure.resistance,
				),
				condition: 'إغلاق مؤكد مع متابعة الحجم',
			},
		},
		data_limitations: [
			'Elliott/Gann/Harmonic غير محسوبة داخل هذا الإطار المستقل',
			'Bid/Ask وعمق السوق غير متاحين',
			'ضغط المشترين تقدير price-volume وليس قياساً مباشراً',
		],
	}
}

function unavailable(timeframe: AdvancedTimeframe, reason: string) {
	return {
		available: false,
		timeframe,
		reason,
		missing_data: [timeframe, 'OHLCV interval'],
	}
}

export function buildAdvancedAnalysis(input: {
	symbol: string
	market: string
	candles: Candle[]
	source: string
	fetchedAt?: string
}) {
	const candles = input.candles.filter(
		(candle) => Number.isFinite(candle.close) && candle.close > 0,
	)
	const hasVolume = candles.some((candle) => (candle.volume ?? 0) > 0)
	const matrix: Record<string, unknown> = {}
	for (const timeframe of ADVANCED_TIMEFRAMES) {
		if (timeframe === '1d')
			matrix[timeframe] =
				candles.length >= 30
					? frame(candles, timeframe)
					: unavailable(timeframe, 'يلزم 30 شمعة يومية على الأقل')
		else if (timeframe === '1w')
			matrix[timeframe] =
				candles.length >= 30
					? frame(aggregate(candles, 5), timeframe)
					: unavailable(timeframe, 'يلزم تاريخ يومي كافٍ لتجميع الأسبوعي')
		else if (timeframe === '1M')
			matrix[timeframe] =
				candles.length >= 60
					? frame(aggregate(candles, 21), timeframe)
					: unavailable(timeframe, 'يلزم 60 شمعة يومية لتجميع الشهري')
		else
			matrix[timeframe] = unavailable(
				timeframe,
				'لم يتم جلب فاصل هذا الإطار؛ لن يتم اشتقاقه من اليومي',
			)
	}
	const daily = matrix['1d'] as Record<string, any>
	const missingFields = [
		...(hasVolume ? [] : ['volume']),
		'bid_ask',
		'market_depth',
		'adjusted_close',
		'realtime_tick',
	]
	return {
		engine: 'advanced_decision_support_v1',
		symbol: input.symbol,
		market: input.market,
		data_quality: {
			quality:
				input.source === 'Yahoo Finance' || input.source === 'Stooq'
					? 'delayed'
					: 'historical',
			source: input.source,
			timestamp: input.fetchedAt ?? new Date().toISOString(),
			candles_count: candles.length,
			missing_fields: missingFields,
			warnings: [
				'الدرجات توافق أدلة وليست احتمال نجاح',
				'الفواصل غير المتاحة معلنة صراحة',
				'التحليل تعليمي ولا يمثل توصية شراء أو بيع',
			],
		},
		timeframe_matrix: matrix,
		top_down: {
			order: ['1Y', '1M', '1W', '1D', '4H', '1H', '30m', '15m', '5m', '1m'],
			higher_timeframe_bias: daily?.trend ?? 'unavailable',
			rule: 'لا تُفهم إشارة فريم صغير بمعزل عن الفريم الأكبر',
		},
		market_overview: daily?.available
			? {
					price: daily.price,
					trend: daily.trend,
					confluence: daily.confluence,
					signal: daily.confluence.signal,
				}
			: { available: false },
	}
}
