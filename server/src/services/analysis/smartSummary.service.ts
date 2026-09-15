export type SummarySignal = 'positive' | 'negative' | 'neutral'

export type SmartSummaryInput = {
	symbol: string
	price: number | null
	updatedAt: string
	rsi?: number | null
	macd?: string | null
	wave?: string | null
	waveDirection?: string | null
	gannDirection?: string | null
	gannSupport?: number | null
	gannResistance?: number | null
	volatility?: number | null
	candleSignal?: 'bullish' | 'bearish' | null
	arima?: number | null
	lstm?: number | null
}

export type SmartSummary = ReturnType<typeof buildSmartSummary>

function finite(value: number | null | undefined): value is number {
	return value != null && Number.isFinite(value)
}

function interpretRSI(rsi: number | null | undefined) {
	if (!finite(rsi)) return null
	if (rsi >= 70)
		return {
			signal: 'negative' as const,
			label: 'تشبع شرائي شديد — احتمال تصحيح',
			weight: -2,
		}
	if (rsi >= 60)
		return {
			signal: 'negative' as const,
			label: 'قريب من التشبع الشرائي',
			weight: -0.5,
		}
	if (rsi <= 30)
		return {
			signal: 'positive' as const,
			label: 'تشبع بيعي — ارتداد محتمل',
			weight: 2,
		}
	if (rsi <= 40)
		return {
			signal: 'positive' as const,
			label: 'قريب من التشبع البيعي',
			weight: 0.5,
		}
	return { signal: 'neutral' as const, label: 'RSI محايد', weight: 0 }
}

function interpretWave(
	wave: string | null | undefined,
	direction: string | null | undefined,
) {
	const normalized = String(wave ?? '').toUpperCase()
	if (['1', '3', '5'].includes(normalized) && direction === 'up')
		return {
			signal: 'positive' as const,
			label: `الموجة ${normalized} الدافعة — صاعدة`,
			weight: 2,
		}
	if (['2', '4', 'A', 'C'].includes(normalized))
		return {
			signal: 'negative' as const,
			label: `الموجة ${normalized} التصحيحية — ضغط هابط`,
			weight: -2,
		}
	if (normalized === 'B')
		return {
			signal: 'neutral' as const,
			label: 'الموجة B — ارتداد داخل تصحيح',
			weight: 0.5,
		}
	return {
		signal: 'neutral' as const,
		label: 'موجة Elliott غير محددة',
		weight: 0,
	}
}

export function buildSmartSummary(input: SmartSummaryInput) {
	const points: Array<{
		title: string
		detail: string
		sentiment: SummarySignal
		weight: number
	}> = []
	const rsi = interpretRSI(input.rsi)
	if (rsi)
		points.push({
			title: `RSI ${input.rsi!.toFixed(2)}`,
			detail: rsi.label,
			sentiment: rsi.signal,
			weight: rsi.weight,
		})
	const wave = interpretWave(input.wave, input.waveDirection)
	if (input.wave)
		points.push({
			title: `Elliott Wave ${String(input.wave).toUpperCase()}`,
			detail: wave.label,
			sentiment: wave.signal,
			weight: wave.weight,
		})
	if (input.macd === 'bullish' || input.macd === 'bearish') {
		const bullish = input.macd === 'bullish'
		points.push({
			title: `MACD ${bullish ? 'صاعد' : 'هابط'}`,
			detail: bullish ? 'دعم قصير المدى' : 'ضغط قصير المدى',
			sentiment: bullish ? 'positive' : 'negative',
			weight: bullish ? 1 : -1,
		})
	}
	if (input.gannDirection === 'up' || input.gannDirection === 'down') {
		const bullish = input.gannDirection === 'up'
		points.push({
			title: `Gann ${bullish ? 'صاعد' : 'هابط'}`,
			detail: 'قراءة زاوية تاريخية وسعرية',
			sentiment: bullish ? 'positive' : 'negative',
			weight: bullish ? 1 : -1,
		})
	}
	if (input.candleSignal) {
		const bullish = input.candleSignal === 'bullish'
		points.push({
			title: 'الشمعة الأخيرة',
			detail: bullish
				? 'إغلاق أعلى من الافتتاح — إشارة صاعدة'
				: 'إغلاق أدنى من الافتتاح — إشارة هابطة',
			sentiment: bullish ? 'positive' : 'negative',
			weight: 1,
		})
	}
	if (finite(input.volatility)) {
		const high = input.volatility! >= 0.35
		points.push({
			title: `التقلب ${(input.volatility! * 100).toFixed(2)}%`,
			detail: high
				? 'تقلب مرتفع — مخاطرة أعلى'
				: 'التقلب ضمن نطاق قابل للمتابعة',
			sentiment: high ? 'negative' : 'neutral',
			weight: high ? -1 : 0,
		})
	}
	const totalWeight = points.reduce((sum, point) => sum + point.weight, 0)
	const maxWeight = Math.max(2, points.length * 2)
	const normalizedScore = (totalWeight / maxWeight) * 100
	const negativeCount = points.filter(
		(point) => point.sentiment === 'negative',
	).length
	const positiveCount = points.filter(
		(point) => point.sentiment === 'positive',
	).length
	const conflicting = negativeCount > 0 && positiveCount > 0
	const action =
		conflicting || Math.abs(normalizedScore) < 20
			? 'HOLD'
			: normalizedScore >= 60
				? 'STRONG_BUY'
				: normalizedScore >= 20
					? 'BUY'
					: normalizedScore <= -60
						? 'STRONG_SELL'
						: 'SELL'
	const confidence = Math.max(
		0,
		Math.min(
			95,
			Math.round(
				conflicting
					? 50 + Math.min(12, Math.abs(normalizedScore) / 5)
					: Math.abs(normalizedScore),
			),
		),
	)
	const actionLabel =
		action === 'HOLD'
			? 'تحييد / انتظار'
			: action === 'STRONG_BUY'
				? 'إيجابي قوي'
				: action === 'BUY'
					? 'إيجابي بحذر'
					: action === 'STRONG_SELL'
						? 'سلبي قوي'
						: 'سلبي بحذر'
	const reason = conflicting
		? 'إشارات متعارضة؛ لا يصح اختزالها في اتجاه واحد.'
		: action === 'HOLD'
			? 'المحصلة لا تمنح أفضلية واضحة؛ الانتظار أكثر انضباطاً.'
			: `المحصلة ${actionLabel} وفق الإشارات المتاحة، مع ضرورة مراجعة المخاطر.`
	const scenario =
		normalizedScore < 0
			? 'هبوط ثم اختبار دعم'
			: normalizedScore > 20
				? 'استمرار مشروط ثم اختبار مقاومة'
				: 'حركة جانبية حتى ظهور محفز'
	const risks = points
		.filter((point) => point.sentiment === 'negative')
		.slice(0, 3)
		.map((point) => point.detail)
	const watch = [
		input.gannResistance ? `مراقبة المقاومة ${input.gannResistance}` : null,
		input.gannSupport ? `مراقبة الدعم ${input.gannSupport}` : null,
		input.rsi && input.rsi >= 70 ? 'عودة RSI دون 70 لتأكيد هدوء التشبع' : null,
	].filter(Boolean)
	return {
		symbol: input.symbol,
		timestamp: input.updatedAt,
		verdict: { action, label: actionLabel, confidence, reason },
		keyPoints: points.sort((a, b) => a.weight - b.weight).slice(0, 5),
		scenario: {
			label: scenario,
			confidence: Math.max(
				35,
				Math.min(75, 50 + Math.round(Math.abs(normalizedScore) / 4)),
			),
			support: input.gannSupport ?? null,
			resistance: input.gannResistance ?? null,
		},
		risks,
		watch,
		counts: { positive: positiveCount, negative: negativeCount, conflicting },
		inputs: {
			rsi: input.rsi ?? null,
			wave: input.wave ?? null,
			macd: input.macd ?? null,
			volatility: input.volatility ?? null,
			candleSignal: input.candleSignal ?? null,
		},
		disclaimer:
			'ملخص تحليلي تعليمي احتمالي، وليس توصية شراء أو بيع أو ضماناً للنتيجة.',
	}
}

export { interpretRSI, interpretWave, interpretWave as interpretElliottWave }
