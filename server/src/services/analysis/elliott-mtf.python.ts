import { analyzeElliottFallback } from './analysis-fallback.js'

type MtfCandle = {
	open: number
	high: number
	low: number
	close: number
	volume: number
}

const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ??
	(process.env.VERCEL_URL
		? `https://${process.env.VERCEL_URL}/api/python`
		: process.env.NODE_ENV === 'production'
			? 'https://www.borsatyai.com/api/python'
			: 'http://127.0.0.1:8001')
).replace(/\/$/, '')

const elliottPath = pythonServiceUrl.endsWith('/api/python')
	? '/elliott'
	: '/analyze/elliott/mtf'

function aggregate(candles: MtfCandle[], step: number): MtfCandle[] {
	if (step <= 1) return candles
	const result: MtfCandle[] = []
	for (let index = 0; index + step <= candles.length; index += step) {
		const group = candles.slice(index, index + step)
		result.push({
			open: group[0].open,
			high: Math.max(...group.map((item) => item.high)),
			low: Math.min(...group.map((item) => item.low)),
			close: group.at(-1)?.close ?? group[0].close,
			volume: group.reduce((sum, item) => sum + item.volume, 0),
		})
	}
	return result
}

function enrichFallback(result: Record<string, any>, timeframe: string) {
	const pivots = Array.isArray(result.pivots) ? result.pivots : []
	const current = result.current_wave ?? {}
	const last = pivots.at(-1)
	const previous = pivots.at(-2)
	const currentPrice = Number(
		current.current_price ?? last?.price ?? previous?.price ?? 0,
	)
	const direction = current.direction === 'down' ? 'down' : 'up'
	const swing = Math.abs(
		Number(last?.price ?? 0) - Number(previous?.price ?? 0),
	)
	const safeSwing =
		Number.isFinite(swing) && swing > 0 ? swing : currentPrice * 0.02
	const sign = direction === 'down' ? -1 : 1
	const targets = {
		target_1: {
			price: Number((currentPrice + sign * safeSwing * 0.618).toFixed(2)),
			fib_ratio: 0.618,
			label: 'هدف 1 — امتداد Fibonacci 61.8%',
		},
		target_2: {
			price: Number((currentPrice + sign * safeSwing).toFixed(2)),
			fib_ratio: 1,
			label: 'هدف 2 — امتداد Fibonacci 100%',
		},
		target_3: {
			price: Number((currentPrice + sign * safeSwing * 1.618).toFixed(2)),
			fib_ratio: 1.618,
			label: 'هدف 3 — امتداد Fibonacci 161.8%',
		},
		based_on: `آخر تأرجح سعري (${timeframe})`,
	}
	const retracement =
		safeSwing > 0 ? Math.min(1, Math.abs(safeSwing / currentPrice)) : 0
	const relationships = {
		wave2_retracement: {
			value: Number((retracement * 100).toFixed(1)),
			nearest_fib: 0.618,
			expected_range: '50% - 61.8%',
			valid: retracement >= 0.4 && retracement <= 0.7,
			label: 'تصحيح الموجة 2',
		},
		wave3_extension: {
			value: 1.618,
			nearest_fib: 1.618,
			expected_range: '1.618 - 2.618',
			valid: false,
			label: 'امتداد الموجة 3 — يحتاج تحققاً من عدّ الموجات',
		},
		wave4_retracement: {
			value: 38.2,
			nearest_fib: 0.382,
			expected_range: '23.6% - 38.2%',
			valid: false,
			label: 'تصحيح الموجة 4 — يحتاج تحققاً من عدّ الموجات',
		},
	}
	const invalidationLevel = Number(
		(direction === 'up' ? previous?.price : previous?.price) ??
			currentPrice * (direction === 'up' ? 0.97 : 1.03),
	)
	const baseConfidence = Number(current.confidence ?? result.confidence ?? 0.3)
	const confidence = Math.min(0.82, Math.max(0.35, baseConfidence))
	return {
		...result,
		current_wave: {
			...current,
			current_price: currentPrice,
			direction,
			confidence,
		},
		targets,
		relationships,
		invalidation: {
			level: Number(invalidationLevel.toFixed(2)),
			reason:
				direction === 'up'
					? 'يبطل السيناريو الصاعد عند كسر قاع التأرجح السابق بإغلاق مؤكد.'
					: 'يبطل السيناريو الهابط عند تجاوز قمة التأرجح السابقة بإغلاق مؤكد.',
			distance_pct: currentPrice
				? Number(
						(
							(Math.abs(currentPrice - invalidationLevel) / currentPrice) *
							100
						).toFixed(2),
					)
				: null,
		},
		confidence,
		confidence_percent: Number((confidence * 100).toFixed(1)),
		confidence_label: 'درجة توافق الأدلة وليست احتمالاً مضموناً',
		method: {
			name: 'ZigZag + قواعد Elliott + Fibonacci',
			status: 'computed',
			note: 'الأهداف حسابية من آخر تأرجح سعري وتحتاج تحققاً من اكتمال البيانات.',
		},
	}
}

export async function analyzeElliottMTF(
	candles: MtfCandle[],
	provided?: Record<string, MtfCandle[]>,
) {
	const candlesByTf = {
		monthly: aggregate(candles, 21),
		weekly: aggregate(candles, 5),
		daily: candles,
		...(provided ?? {}),
	}
	try {
		const response = await fetch(`${pythonServiceUrl}${elliottPath}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ candles_by_tf: candlesByTf }),
			signal: AbortSignal.timeout(7000),
		})
		const body = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(`Python Elliott MTF ${response.status}`)
		return {
			...body,
			source: body?.source ?? 'python_vercel',
			engine_mode: 'python_live',
		}
	} catch {
			const computedFrames = Object.entries(candlesByTf).reduce<
			Record<string, Record<string, unknown>>
		>((frames, [timeframe, frameCandles]) => {
			if (frameCandles.length < 30) return frames
			const result = enrichFallback(
				analyzeElliottFallback(frameCandles.map((item) => item.close)),
				timeframe,
			)
			const wave = result.current_wave?.wave ?? '?'
			const direction =
				wave === 'C' ? 'down' : (result.current_wave?.direction ?? 'unknown')
			const targets = result.targets ?? {}
			const invalidation = result.invalidation ?? {}
			frames[timeframe] = {
				available: true,
				timeframe,
				timeframe_ar:
					timeframe === 'monthly'
						? 'شهري'
						: timeframe === 'weekly'
							? 'أسبوعي'
							: timeframe === '4h'
								? '4 ساعات'
								: 'يومي',
				weight:
					timeframe === 'monthly'
						? 4
						: timeframe === 'weekly'
							? 3
							: timeframe === '4h'
								? 1
								: 2,
				current_wave: wave,
				direction,
				confidence: result.confidence ?? 0,
				confidence_percent: result.confidence_percent ?? 0,
				wave_personality:
					wave === 'C'
						? 'موجة تصحيحية هابطة محتملة'
							: 'تصنيف يحتاج تحققاً إضافياً',
				primary_count: result,
				alternate_count: {
					wave: wave === 'C' ? '3' : wave === '5' ? '3' : 'C',
					confidence: 0.25,
						condition: 'تحتاج بيانات إضافية لهذا الإطار',
				},
				targets,
				invalidation,
				relationships: result.relationships ?? {},
				method: result.method,
			}
			return frames
		}, {})
			const daily = computedFrames.daily ?? {}
		const dailyDirection = String(daily.direction ?? 'unknown')
		return {
				status: 'computed',
				source: 'computed',
				engine_mode: 'computed',
			data: {
					by_timeframe: computedFrames,
				consensus: {
					direction: dailyDirection,
					confidence: daily.confidence ?? 0,
					agreement: 1,
						timeframes: Object.keys(computedFrames).length,
				},
				dominant_direction: dailyDirection,
				dominant_confidence: daily.confidence ?? 0,
					disclaimer:
						'النتيجة مبنية على الأطر المتاحة وقت التحليل وتحتاج مراجعة بيانات المصدر.',
			},
		}
	}
}
