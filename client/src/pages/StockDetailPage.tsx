import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import {
	formatEnglishNumber,
	formatEnglishPercent,
	formatEnglishScalar,
} from '../lib/format'

type Candle = { date: string; close: number; volume: number }
type Scalar = string | number | null | undefined
type Candles = {
	symbol: string
	candles: Candle[]
	count: number
	freshness?: 'live' | 'delayed' | 'cached'
}
type Watchlist = { id: string; items: { symbol: string }[] }
type FeaturePayload = {
	forecast?: number[]
	confidence?: number
	articleCount?: number
	distribution?: Record<string, number>
	latest?: boolean
	anomalyCount?: number
}
type FeatureResponse = FeaturePayload & { data?: FeaturePayload }
type AnalysisResponse = {
	data?: Record<string, unknown>
	[key: string]: unknown
}
type IntegratedAnalysis = {
	indicators: AnalysisResponse | null
	elliott: AnalysisResponse | null
	gann: AnalysisResponse | null
	consensus: AnalysisResponse | null
	statistical: AnalysisResponse | null
	arima: AnalysisResponse | null
	lstm: AnalysisResponse | null
	backtest: AnalysisResponse | null
}
type FullAnalysisResponse = {
	data?: Partial<IntegratedAnalysis>
	data_quality?: {
		status?: string
		price_freshness?: string
		decision?: string
		message?: string
	}
	stages?: string[]
	completed_engines?: number
}
type FinancialStatement = {
	filingDate?: Scalar
	period?: Scalar
	revenue?: Scalar
	totalRevenue?: Scalar
	netIncome?: Scalar
	netIncomeLoss?: Scalar
}
type Fundamentals = {
	keyRatios?: Record<string, Scalar>
	incomeStatement?: FinancialStatement[]
	available?: boolean
}
type InsiderTrade = {
	id: string
	insiderName: string
	insiderRole: string
	transactionType: 'BUY' | 'SELL'
	shares: number
}
type Ownership = {
	shareholders?: Array<{ name: string; percentage: number | null }>
	available?: boolean
}

const analysisPayload = (response: AnalysisResponse | null) => {
	if (response?.data && typeof response.data === 'object') return response.data
	return response ?? {}
}

const nestedValue = (value: unknown, path: string[]) => {
	let current = value
	for (const key of path) {
		if (!current || typeof current !== 'object') return undefined
		current = (current as Record<string, unknown>)[key]
	}
	return current
}

const numberValue = (value: unknown, path: string[] = []) => {
	const candidate = nestedValue(value, path)
	if (typeof candidate === 'number' && Number.isFinite(candidate))
		return candidate
	if (typeof candidate === 'string' && candidate.trim() !== '') {
		const parsed = Number(candidate)
		if (Number.isFinite(parsed)) return parsed
	}
	return undefined
}

const stringValue = (value: unknown, path: string[] = []) => {
	const candidate = nestedValue(value, path)
	return typeof candidate === 'string' && candidate.trim()
		? candidate
		: undefined
}

export function StockDetailPage({ symbol }: { symbol: string }) {
	const [data, setData] = useState<Candles | null>(null)
	const [ensembleData, setEnsembleData] = useState<FeatureResponse | null>(null)
	const [sentimentData, setSentimentData] = useState<FeatureResponse | null>(
		null,
	)
	const [anomalyData, setAnomalyData] = useState<FeatureResponse | null>(null)
	const [integratedAnalysis, setIntegratedAnalysis] =
		useState<IntegratedAnalysis>({
			indicators: null,
			elliott: null,
			gann: null,
			consensus: null,
			statistical: null,
			arima: null,
			lstm: null,
			backtest: null,
		})
	const [analysisStages, setAnalysisStages] = useState<string[]>([])
	const [analysisQuality, setAnalysisQuality] =
		useState<FullAnalysisResponse['data_quality']>()
	const [completedEngines, setCompletedEngines] = useState(0)
	const [fundamentals, setFundamentals] = useState<Fundamentals | null>(null)
	const [insiderTrades, setInsiderTrades] = useState<InsiderTrade[]>([])
	const [ownership, setOwnership] = useState<Ownership | null>(null)
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(false)
	const normalized = symbol.toUpperCase()
	const market = /^\d{4,5}$/u.test(normalized) ? 'TASI' : 'EGX'
	const livePrice = useLivePrice(normalized, market)

	useEffect(() => {
		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 12_000)
		let cancelled = false
		void api<Candles>(
			`/api/market/candles/${normalized}?market=${market}&days=120`,
			{
				signal: controller.signal,
			},
		)
			.then((result) => {
				if (!cancelled) setData(result)
			})
			.catch(() => {
				if (!cancelled) setMessage('لا تتوفر بيانات تاريخية حالياً')
			})
			.finally(() => {
				window.clearTimeout(timeout)
				if (!cancelled) setLoading(false)
			})
		void api<FeatureResponse>(`/api/analysis/${normalized}/ensemble?steps=7`)
			.then(setEnsembleData)
			.catch(() => undefined)
		void api<FeatureResponse>(`/api/analysis/${normalized}/sentiment`)
			.then(setSentimentData)
			.catch(() => undefined)
		void api<FeatureResponse>(`/api/analysis/${normalized}/anomalies`)
			.then(setAnomalyData)
			.catch(() => undefined)
		void api<FullAnalysisResponse>(
			`/api/analysis/${normalized}/full?market=${market}`,
			{ suppressToast: true },
		)
			.then((result) => {
				if (cancelled) return
				setIntegratedAnalysis({
					indicators: result.data?.indicators ?? null,
					elliott: result.data?.elliott ?? null,
					gann: result.data?.gann ?? null,
					consensus: result.data?.consensus ?? null,
					statistical: result.data?.statistical ?? null,
					arima: result.data?.arima ?? null,
					lstm: result.data?.lstm ?? null,
					backtest: result.data?.backtest ?? null,
				})
				setAnalysisStages(result.stages ?? [])
				setAnalysisQuality(result.data_quality)
				setCompletedEngines(result.completed_engines ?? 0)
			})
			.catch(() => undefined)
		void api<Fundamentals>(`/api/fundamentals/${normalized}`)
			.then(setFundamentals)
			.catch(() => undefined)
		void api<{ data: InsiderTrade[] }>(`/api/insider-trades/${normalized}`)
			.then((result) => setInsiderTrades(result.data))
			.catch(() => undefined)
		void api<Ownership>(`/api/ownership/${normalized}`)
			.then(setOwnership)
			.catch(() => undefined)
		return () => {
			cancelled = true
			controller.abort()
			window.clearTimeout(timeout)
		}
	}, [market, normalized])

	const stats = useMemo(() => {
		const candles = data?.candles ?? []
		const last = candles.at(-1)
		const previous = candles.at(-2)
		return {
			last,
			changePercent:
				last && previous
					? ((last.close - previous.close) / previous.close) * 100
					: null,
			high: candles.length
				? Math.max(...candles.map((item) => item.close))
				: null,
			low: candles.length
				? Math.min(...candles.map((item) => item.close))
				: null,
		}
	}, [data])

	const addToWatchlist = async () => {
		try {
			const lists = await api<Watchlist[]>('/api/watchlists')
			const list =
				lists[0] ??
				(await api<Watchlist>('/api/watchlists', {
					method: 'POST',
					body: JSON.stringify({ name: 'قائمتي' }),
				}))
			await api(`/api/watchlists/${list.id}/items`, {
				method: 'POST',
				body: JSON.stringify({ symbol: normalized }),
			})
			setMessage('تمت إضافة السهم إلى قائمتك')
		} catch {
			setMessage('سجّل الدخول لإضافة السهم إلى قائمتك')
		}
	}
	const listen = async () => {
		const text = `السعر الحالي لسهم ${normalized} هو ${formatEnglishNumber(stats.last?.close)}. التغير ${formatEnglishPercent(stats.changePercent)}.`
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL ?? ''}/api/analysis/${normalized}/audio`,
			)
			if (
				response.ok &&
				response.headers.get('content-type')?.includes('audio')
			) {
				const audio = new Audio(URL.createObjectURL(await response.blob()))
				setIsPlaying(true)
				audio.onended = () => setIsPlaying(false)
				await audio.play()
				return
			}
		} catch {
			/* use browser speech fallback */
		}
		if ('speechSynthesis' in window) {
			window.speechSynthesis.cancel()
			window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
		}
	}

	const ai = ensembleData?.data ?? ensembleData
	const mood = sentimentData?.data ?? sentimentData
	const anomalyResult = anomalyData?.data ?? anomalyData
	const fundamentalMetrics: Array<[string, Scalar]> = [
		['P/E', fundamentals?.keyRatios?.peRatio],
		['EPS', fundamentals?.keyRatios?.eps],
		['القيمة السوقية', fundamentals?.keyRatios?.marketCap],
		['عائد التوزيعات', fundamentals?.keyRatios?.dividendYield],
		['أعلى 52 أسبوعاً', fundamentals?.keyRatios?.fiftyTwoWeekHigh],
		['أدنى 52 أسبوعاً', fundamentals?.keyRatios?.fiftyTwoWeekLow],
	]
	const indicatorResult = analysisPayload(integratedAnalysis.indicators)
	const elliottResult = analysisPayload(integratedAnalysis.elliott)
	const gannResult = analysisPayload(integratedAnalysis.gann)
	const consensusResult = analysisPayload(integratedAnalysis.consensus)
	const statisticalResult = analysisPayload(integratedAnalysis.statistical)
	const arimaResult = analysisPayload(integratedAnalysis.arima)
	const lstmResult = analysisPayload(integratedAnalysis.lstm)
	const backtestResult = analysisPayload(integratedAnalysis.backtest)
	const consensusSignal = stringValue(consensusResult, ['signal'])
	const consensusSignalArabic =
		consensusSignal === 'STRONG_BUY' || consensusSignal === 'BUY'
			? 'ميل إيجابي'
			: consensusSignal === 'STRONG_SELL' || consensusSignal === 'SELL'
				? 'ميل سلبي'
				: consensusSignal === 'HOLD'
					? 'محايد / غير حاسم'
					: 'غير متاح'
	const elliottDirection = stringValue(elliottResult, [
		'current_wave',
		'direction',
	])
	const gannSupport = numberValue(gannResult, ['square_of_nine', 'support'])
	const gannResistance = numberValue(gannResult, [
		'square_of_nine',
		'resistance',
	])
	const arimaForecast = numberValue(arimaResult, ['forecast', '0'])
	const lstmForecast = numberValue(lstmResult, ['forecast', '0'])
	const keltnerPosition = stringValue(indicatorResult, ['keltner', 'position'])
	const trendDirection = stringValue(indicatorResult, [
		'trendAngle',
		'direction',
	])
	const trendDirectionArabic =
		trendDirection === 'up'
			? 'صاعد'
			: trendDirection === 'down'
				? 'هابط'
				: trendDirection === 'flat'
					? 'جانبي'
					: 'غير متاح'
	const fibonacciDirection = stringValue(indicatorResult, [
		'fibonacci',
		'direction',
	])
	const fibonacciDirectionArabic =
		fibonacciDirection === 'up'
			? 'اتجاه صاعد'
			: fibonacciDirection === 'down'
				? 'اتجاه هابط'
				: 'غير متاح'
	const analysisEnginesAvailable = [
		indicatorResult,
		elliottResult,
		gannResult,
		consensusResult,
		statisticalResult,
		arimaResult,
		lstmResult,
		backtestResult,
	].filter((result) => Object.keys(result).length > 0).length
	const signalExplanation = consensusSignal
		? `القراءة الحالية هي «${consensusSignalArabic}». هذا مقياس اتفاق بين محركات تعليمية، وليس احتمال نجاح أو أمر شراء/بيع.`
		: 'لم يكتمل إجماع المحركات لهذا الرمز؛ ستظهر القراءة عند توفر بيانات صالحة.'
	const riskExplanation = numberValue(statisticalResult, ['var_95'])
		? 'تظهر مقاييس التقلب وVaR وSharpe لتوضيح المخاطر التاريخية قبل تفسير أي حركة سعرية.'
		: 'لا تتوفر مقاييس مخاطر كافية حالياً؛ لذلك لا نضع حكماً رقمياً على المخاطرة.'
	const validationExplanation = numberValue(backtestResult, ['win_rate'])
		? 'الاختبار التاريخي يعرض سلوك الفرضية على بيانات سابقة، ولا يثبت نجاحها في المستقبل.'
		: 'لم تتوفر نتيجة اختبار تاريخي مكتملة لهذا الرمز؛ لا يتم استبدالها بتقدير.'

	return (
		<main className="stock-detail-page" dir="rtl">
			<header className="stock-detail-header">
				<a className="stock-brand" href="/" aria-label="العودة إلى borsatyai">
					<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				</a>
				<button className="link-button" onClick={() => window.history.back()}>
					← العودة
				</button>
				<div>
					<p className="eyebrow">تفاصيل السهم</p>
					<h1>{normalized}</h1>
				</div>
				<div className="stock-header-actions">
					<button className="secondary-button" onClick={listen}>
						{isPlaying ? '⏸ إيقاف الصوت' : '🎧 استمع للتحليل'}
					</button>
					<button className="primary-button" onClick={addToWatchlist}>
						＋ أضف إلى قائمتي
					</button>
					<a
						className="secondary-button"
						href={`/api/reports/stock/${normalized}/pdf`}
						download
					>
						📄 PDF
					</a>
				</div>
			</header>
			{loading && (
				<div className="stock-detail-skeleton">
					<i />
					<i />
					<i />
				</div>
			)}
			{message && <div className="analysis-error">{message}</div>}
			{!loading && !data && (
				<section className="analysis-empty-panel stock-empty-panel">
					<strong>بيانات السهم غير متاحة حالياً</strong>
					<p>
						لم تُرجع مصادر الشموع بيانات موثوقة لهذا الرمز. لن نعرض أرقاماً
						تجريبية.
					</p>
				</section>
			)}
			{data && !loading && (
				<>
					<section className="stock-hero-card">
						<div>
							<span>السعر الحالي</span>
							<strong>
								{formatEnglishNumber(livePrice?.price ?? stats.last?.close)}
							</strong>
							<span
								className={`freshness-badge ${livePrice?.freshness ?? data.freshness ?? 'cached'}`}
								title={
									livePrice?.freshness === 'delayed'
										? 'السعر متأخر عن السوق'
										: 'بيانات السعر متاحة حالياً'
								}
							>
								{livePrice?.freshness === 'live'
									? 'Live'
									: livePrice?.freshness === 'delayed'
										? 'Delayed'
										: 'Cached'}
							</span>
						</div>
						<div
							className={
								stats.changePercent != null && stats.changePercent >= 0
									? 'positive'
									: 'negative'
							}
						>
							{formatEnglishPercent(stats.changePercent)}
						</div>
					</section>
					<section className="stock-stats-grid">
						<div>
							<span>أعلى فترة</span>
							<b>{formatEnglishNumber(stats.high)}</b>
						</div>
						<div>
							<span>أدنى فترة</span>
							<b>{formatEnglishNumber(stats.low)}</b>
						</div>
						<div>
							<span>عدد الشموع</span>
							<b>{data.count}</b>
						</div>
						<div>
							<span>آخر حجم</span>
							<b>{formatEnglishNumber(stats.last?.volume, 0)}</b>
						</div>
					</section>
					<section className="analysis-card stock-chart-card">
						<h2>الأداء التاريخي</h2>
						<div className="stock-sparkline">
							{data.candles.slice(-60).map((candle, index, values) => {
								const min = Math.min(...values.map((item) => item.close))
								const max = Math.max(...values.map((item) => item.close))
								return (
									<span
										key={candle.date}
										style={{
											left: `${(index / Math.max(values.length - 1, 1)) * 100}%`,
											top: `${96 - ((candle.close - min) / Math.max(max - min, 0.0001)) * 88}%`,
										}}
									/>
								)
							})}
						</div>
					</section>
					<section className="analysis-card integrated-analysis-panel">
						<div className="panel-title">
							<div>
								<h2>غرفة التحليل المتكاملة</h2>
								<p className="muted">
									يُبحث عن السهم أولاً، ثم تُقرأ البيانات و8 محركات مستقلة قبل
									بناء الخلاصة. لا تمثل النتائج توصية أو ضماناً.
								</p>
							</div>
							<span className="eyebrow">{completedEngines}/8 محركات</span>
						</div>
						<div className="analysis-data-quality" role="note">
							<strong>حدود القراءة:</strong>{' '}
							{analysisQuality?.message ??
								'النتائج تعليمية ولا تمثل توصية استثمارية أو قراراً آلياً.'}
						</div>
						{analysisStages.length > 0 && (
							<div className="analysis-pipeline" aria-label="مراحل التحليل">
								{analysisStages.map((stage, index) => (
									<span key={stage}>
										<b>{index + 1}</b>
										{stage}
									</span>
								))}
							</div>
						)}
						<div className="integrated-analysis-grid">
							<div className="integrated-analysis-card is-primary">
								<span>الإجماع</span>
								<strong>
									{formatEnglishNumber(
										numberValue(consensusResult, ['score']),
										0,
									)}
								</strong>
								<small>
									{consensusSignalArabic} · اتفاق المحركات{' '}
									{formatEnglishNumber(
										numberValue(consensusResult, ['confidence']),
										0,
									)}
									% (ليس احتمال نجاح)
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>المؤشرات الفنية</span>
								<strong>
									RSI{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, ['rsi', 'value']),
									)}
								</strong>
								<small>
									MACD {stringValue(indicatorResult, ['macd', 'signal']) ?? '—'}{' '}
									· SMA20{' '}
									{formatEnglishNumber(numberValue(indicatorResult, ['sma20']))}
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>قنوات كايتلر</span>
								<strong>
									{keltnerPosition === 'above'
										? 'فوق القناة'
										: keltnerPosition === 'below'
											? 'تحت القناة'
											: keltnerPosition === 'inside'
												? 'داخل القناة'
												: 'غير متاح'}
								</strong>
								<small>
									علوي{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, ['keltner', 'upper']),
									)}{' '}
									· سفلي{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, ['keltner', 'lower']),
									)}
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>زاوية الاتجاه</span>
								<strong>{trendDirectionArabic}</strong>
								<small>
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'trendAngle',
											'angleDegrees',
										]),
									)}
									° ·{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'trendAngle',
											'percentPerCandle',
										]),
									)}
									% لكل شمعة
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>فيبوناتشي المتقدم</span>
								<strong>{fibonacciDirectionArabic}</strong>
								<small>
									23.6%{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'fibonacci',
											'retracement',
											'0.236',
										]),
									)}{' '}
									· 61.8%{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'fibonacci',
											'retracement',
											'0.618',
										]),
									)}
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>المناطق الديناميكية</span>
								<strong>
									دعم{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'fibonacci',
											'dynamicSupport',
											'level',
										]),
									)}
								</strong>
								<small>
									مقاومة{' '}
									{formatEnglishNumber(
										numberValue(indicatorResult, [
											'fibonacci',
											'dynamicResistance',
											'level',
										]),
									)}{' '}
									· نطاق ATR
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>Elliott Wave</span>
								<strong>{elliottDirection ?? 'غير متاح'}</strong>
								<small>
									الموجة{' '}
									{stringValue(elliottResult, ['current_wave', 'wave']) ?? '—'}{' '}
									· ثقة{' '}
									{formatEnglishPercent(
										(numberValue(elliottResult, ['confidence']) ?? 0) * 100,
									)}
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>Gann</span>
								<strong>دعم {formatEnglishNumber(gannSupport)}</strong>
								<small>مقاومة {formatEnglishNumber(gannResistance)}</small>
							</div>
							<div className="integrated-analysis-card">
								<span>الإحصاء والمخاطر</span>
								<strong>
									Volatility{' '}
									{formatEnglishPercent(
										(numberValue(statisticalResult, ['volatility']) ??
											Number.NaN) * 100,
									)}
								</strong>
								<small>
									VaR 95%{' '}
									{formatEnglishPercent(
										(numberValue(statisticalResult, ['var_95']) ?? Number.NaN) *
											100,
									)}{' '}
									· Sharpe{' '}
									{formatEnglishNumber(
										numberValue(statisticalResult, ['sharpe_ratio']),
									)}
								</small>
							</div>
							<div className="integrated-analysis-card">
								<span>Forecast baselines</span>
								<strong>ARIMA {formatEnglishNumber(arimaForecast)}</strong>
								<small>LSTM {formatEnglishNumber(lstmForecast)} · تعليمي</small>
							</div>
							<div className="integrated-analysis-card">
								<span>Backtest تعليمي</span>
								<strong>
									Win rate{' '}
									{formatEnglishPercent(
										(numberValue(backtestResult, ['win_rate']) ?? Number.NaN) *
											100,
									)}
								</strong>
								<small>
									Max drawdown{' '}
									{formatEnglishPercent(
										(numberValue(backtestResult, ['max_drawdown']) ??
											Number.NaN) * 100,
									)}
								</small>
							</div>
						</div>
					</section>
					<section className="analysis-card analysis-reading-panel">
						<div className="panel-title">
							<div>
								<h2>كيف نقرأ هذه النتائج؟</h2>
								<p className="muted">
									شرح مختصر يربط المخرجات بالسياق بدلاً من ترك المستخدم أمام
									أرقام منفصلة.
								</p>
							</div>
							<span className="eyebrow">
								{analysisEnginesAvailable}/8 محركات
							</span>
						</div>
						<div className="analysis-reading-grid">
							<div>
								<span>الإشارة المركبة</span>
								<strong>{signalExplanation}</strong>
							</div>
							<div>
								<span>سياق المخاطر</span>
								<strong>{riskExplanation}</strong>
							</div>
							<div>
								<span>التحقق التاريخي</span>
								<strong>{validationExplanation}</strong>
							</div>
						</div>
						<p className="analysis-reading-note">
							النتيجة التعليمية الأقوى هي التي تتفق فيها عدة محركات مع بيانات
							سعرية كافية. عند اختلافها، نعرض الاختلاف بدلاً من إخفائه.
						</p>
					</section>
					<section className="analysis-card stock-ai-grid">
						<div>
							<span className="eyebrow">Ensemble Prediction</span>
							<strong>{formatEnglishNumber(ai?.forecast?.[0])}</strong>
							<small>
								ثقة مجمعة: {formatEnglishPercent(ai?.confidence ?? null)}
							</small>
						</div>
						<div>
							<span className="eyebrow">المزاج العام</span>
							<strong>{mood?.articleCount ?? 0} خبر</strong>
							<small>إيجابي {mood?.distribution?.positive ?? 0}%</small>
						</div>
						<div>
							<span className="eyebrow">رصد الشذوذ</span>
							<strong
								className={anomalyResult?.latest ? 'negative' : 'positive'}
							>
								{anomalyResult?.latest ? '⚠️ شذوذ' : 'طبيعي'}
							</strong>
							<small>{anomalyResult?.anomalyCount ?? 0} حالات مرصودة</small>
						</div>
					</section>
					<section className="analysis-card fundamentals-panel">
						<div className="panel-title">
							<h2>البيانات المالية</h2>
							<span className="eyebrow">مالية</span>
						</div>
						<div className="fundamentals-grid">
							{fundamentalMetrics.map(([label, value]) => (
								<div key={String(label)}>
									<span>{label}</span>
									<strong>
										{value == null ? '—' : formatEnglishScalar(value)}
									</strong>
								</div>
							))}
						</div>
						{fundamentals?.incomeStatement?.length ? (
							<div className="fundamentals-table">
								{fundamentals.incomeStatement.slice(0, 5).map((item, index) => (
									<div key={index}>
										<span>
											{item.filingDate ?? item.period ?? `سنة ${index + 1}`}
										</span>
										<b>{item.revenue ?? item.totalRevenue ?? '—'}</b>
										<b>{item.netIncome ?? item.netIncomeLoss ?? '—'}</b>
									</div>
								))}
							</div>
						) : (
							<p className="muted">
								لا تتوفر قوائم مالية منظمة لهذا الرمز حالياً.
							</p>
						)}
						<small>
							{fundamentals?.available
								? `بيانات مالية متاحة`
								: 'لا تتوفر بيانات مالية موثوقة حالياً.'}
						</small>
					</section>
					<section className="analysis-card governance-panel">
						<div className="panel-title">
							<h2>الحوكمة والإفصاحات</h2>
							<span className="eyebrow">Insider Trading</span>
						</div>
						<div className="ownership-list">
							{(ownership?.shareholders ?? []).map((item) => (
								<div key={item.name}>
									<span>{item.name}</span>
									<b>{item.percentage == null ? '—' : `${item.percentage}%`}</b>
								</div>
							))}
							{!ownership?.available && (
								<p className="muted">
									لا تتوفر إفصاحات ملكية موثوقة لهذا الرمز حالياً.
								</p>
							)}
						</div>
						<div className="fundamentals-table">
							{insiderTrades.slice(0, 6).map((item) => (
								<div key={item.id}>
									<span>
										{item.insiderName} · {item.insiderRole}
									</span>
									<b
										className={
											item.transactionType === 'BUY' ? 'positive' : 'negative'
										}
									>
										{item.transactionType === 'BUY' ? 'شراء' : 'بيع'}
									</b>
									<b>{formatEnglishNumber(item.shares, 0)}</b>
								</div>
							))}
							{insiderTrades.length === 0 && (
								<p className="muted">
									لا توجد معاملات داخلية موثقة متاحة حالياً.
								</p>
							)}
						</div>
						<small>
							الأرقام غير المتاحة تظهر كشرطة ولا تمثل توصية استثمارية.
						</small>
					</section>
				</>
			)}
		</main>
	)
}
