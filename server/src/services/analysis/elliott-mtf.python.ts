import { analyzeElliottFallback } from './analysis-fallback.js'

type MtfCandle = {
	open: number
	high: number
	low: number
	close: number
	volume: number
}

const pythonServiceUrl = (
	process.env.PYTHON_SERVICE_URL ?? 'http://127.0.0.1:8001'
).replace(/\/$/, '')

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
		const response = await fetch(`${pythonServiceUrl}/analyze/elliott/mtf`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ candles_by_tf: candlesByTf }),
			signal: AbortSignal.timeout(7000),
		})
		const body = await response.json().catch(() => ({}))
		if (!response.ok) throw new Error(`Python Elliott MTF ${response.status}`)
		return body
	} catch {
		const fallbackFrames = Object.entries(candlesByTf).reduce<
			Record<string, Record<string, unknown>>
		>((frames, [timeframe, frameCandles]) => {
			if (frameCandles.length < 30) return frames
			const result = analyzeElliottFallback(
				frameCandles.map((item) => item.close),
			)
			const direction = result.current_wave?.direction ?? 'unknown'
			frames[timeframe] = {
				timeframe,
				timeframe_ar:
					timeframe === 'monthly'
						? 'شهري'
						: timeframe === 'weekly'
							? 'أسبوعي'
							: 'يومي',
				weight: timeframe === 'monthly' ? 4 : timeframe === 'weekly' ? 3 : 2,
				current_wave: result.current_wave?.wave ?? '?',
				direction,
				confidence: result.confidence ?? 0,
				wave_personality: 'تصنيف احتياطي يحتاج تحققاً',
				primary_count: result,
				alternate_count: {
					confidence: 0.25,
					condition: 'تحتاج بيانات Python متعددة الأطر',
				},
			}
			return frames
		}, {})
		const daily = fallbackFrames.daily ?? {}
		const dailyDirection = String(daily.direction ?? 'unknown')
		return {
			status: 'fallback',
			data: {
				by_timeframe: fallbackFrames,
				consensus: {
					direction: dailyDirection,
					confidence: daily.confidence ?? 0,
					agreement: 1,
					timeframes: 1,
				},
				dominant_direction: dailyDirection,
				dominant_confidence: daily.confidence ?? 0,
				disclaimer:
					'تحليل احتياطي تعليمي؛ خدمة Python متعددة الأطر غير متاحة حالياً.',
			},
		}
	}
}
