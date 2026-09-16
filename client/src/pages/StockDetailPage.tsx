import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import ProfessionalStockChart from '../components/ProfessionalStockChart'
import { BrilliantSummary } from '../components/Analysis/BrilliantSummary'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'

type Candle = {
	date: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}

type Candles = {
	symbol: string
	candles: Candle[]
	count: number
	freshness?: 'live' | 'delayed' | 'cached'
}

type Watchlist = { id: string; items: { symbol: string }[] }

type CompanyResponse = { nameAr?: string }

type ElliottFrame = {
	available?: boolean
	availability_reason?: string
	timeframe_ar: string
	current_wave: string
	wave_personality: string
	direction: string
	confidence: number
	alternate_count?: { wave?: string }
	targets?: {
		target_1?: number | { price?: number }
		target_2?: number | { price?: number }
		target_3?: number | { price?: number }
	}
	invalidation_level?: { level?: number }
	invalidation?: { level?: number; distance_pct?: number; reason?: string }
	relationships?: Record<
		string,
		{ value?: number; ratio?: number; valid?: boolean }
	>
	confidence_percent?: number
}

type ElliottMtfData = {
	by_timeframe?: Record<string, ElliottFrame>
	consensus?: { direction?: string; confidence?: number }
	disclaimer?: string
	source?: string
}

type EngineStatus = {
	python_engine?: { live?: boolean; status?: string; engines?: string[] }
}

export function StockDetailPage({
	symbol,
	companyName,
	market: marketOverride,
}: {
	symbol: string
	companyName?: string
	market?: 'EGX' | 'TASI'
}) {
	const normalized = symbol.toUpperCase()
	const market =
		marketOverride ?? (/^\d{4,5}$/u.test(normalized) ? 'TASI' : 'EGX')
	const [data, setData] = useState<Candles | null>(null)
	const [resolvedCompanyName, setResolvedCompanyName] = useState<string>()
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(false)
	const [activeTab, setActiveTab] = useState<'technical' | 'decision'>(
		'technical',
	)
	const [elliottMtf, setElliottMtf] = useState<ElliottMtfData>()
	const [engineStatus, setEngineStatus] =
		useState<EngineStatus['python_engine']>()
	const livePrice = useLivePrice(normalized, market)

	useEffect(() => {
		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 12_000)
		let cancelled = false
		void api<Candles>(
			`/api/market/candles/${normalized}?market=${market}&days=250`,
			{ signal: controller.signal },
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
		void api<CompanyResponse>(`/api/market/company/${normalized}`, {
			suppressToast: true,
		})
			.then((result) => {
				if (
					!cancelled &&
					result.nameAr &&
					result.nameAr.toUpperCase() !== normalized
				)
					setResolvedCompanyName(result.nameAr)
			})
			.catch(() => undefined)
		void api<{ data?: ElliottMtfData }>(
			`/api/analysis/${normalized}/elliott-mtf?market=${market}`,
			{ suppressToast: true },
		)
			.then((result) => {
				if (!cancelled) setElliottMtf(result.data)
			})
			.catch(() => undefined)
		void api<EngineStatus>(
			`/api/analysis/${normalized}/full?market=${market}`,
			{ suppressToast: true },
		)
			.then((result) => {
				if (!cancelled) setEngineStatus(result.python_engine)
			})
			.catch(() => {
				if (!cancelled)
					setEngineStatus({
						live: false,
						status: 'الوضع الاحتياطي — البيانات قد تكون غير محدثة',
					})
			})
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
				last && previous && previous.close !== 0
					? ((last.close - previous.close) / previous.close) * 100
					: null,
		}
	}, [data])

	const displayCompanyName =
		resolvedCompanyName ??
		(companyName && companyName.toUpperCase() !== normalized
			? companyName
			: undefined)

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
			/* Browser speech is the intentional fallback. */
		}
		if ('speechSynthesis' in window) {
			window.speechSynthesis.cancel()
			window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
		}
	}

	const shareStock = async () => {
		const url = `${window.location.origin}/stock/${normalized}`
		try {
			await navigator.clipboard.writeText(url)
			setMessage('تم نسخ رابط السهم')
		} catch {
			setMessage(url)
		}
	}

	return (
		<main className="stock-detail-page" dir="rtl">
			<header className="stock-detail-header stock-detail-header--unified">
				<a className="stock-brand" href="/" aria-label="العودة إلى borsatyai">
					<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				</a>
				<button className="link-button" onClick={() => window.history.back()}>
					← العودة
				</button>
				<div className="stock-identity">
					<p className="eyebrow">تحليل سهم موحد</p>
					<span
						className={`market-badge ${market === 'TASI' ? 'market-tasi' : 'market-egx'}`}
					>
						{market === 'TASI' ? 'السعودية · SAR' : 'مصر · EGP'}
					</span>
					<h1>
						{displayCompanyName ?? normalized}
						<small className="stock-symbol-label">{normalized}</small>
					</h1>
				</div>
				<div className="stock-header-quote" aria-label="السعر والتغير">
					<span>السعر الحالي</span>
					<strong>
						{formatEnglishNumber(livePrice?.price ?? stats.last?.close)}
					</strong>
					<b
						className={
							stats.changePercent != null && stats.changePercent >= 0
								? 'positive'
								: 'negative'
						}
					>
						{formatEnglishPercent(stats.changePercent)}
					</b>
				</div>
				<div className="stock-header-actions">
					<button className="secondary-button" onClick={listen}>
						{isPlaying ? 'إيقاف الصوت' : 'استمع للتحليل'}
					</button>
					<button className="primary-button" onClick={addToWatchlist}>
						＋ أضف إلى قائمتي
					</button>
					<button className="secondary-button" onClick={shareStock}>
						مشاركة
					</button>
					<a
						className="secondary-button"
						href={`/api/reports/stock/${normalized}/pdf`}
						download
					>
						PDF
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
				<div className="stock-analysis-single-page">
					<nav className="analysis-tabs" aria-label="أقسام تحليل السهم">
						<button
							className={activeTab === 'technical' ? 'is-active' : ''}
							onClick={() => setActiveTab('technical')}
						>
							التحليل الفني المتقدم
						</button>
						<button
							className={activeTab === 'decision' ? 'is-active' : ''}
							onClick={() => setActiveTab('decision')}
						>
							القرار والتوصية
						</button>
					</nav>
					{activeTab === 'technical' ? (
						<>
							<section
								className="analysis-card stock-chart-card"
								aria-label="الرسم والمؤشرات الفنية"
							>
								<div className="panel-title">
									<div>
										<span className="eyebrow">السعر والحجم · {normalized}</span>
										<h2>الرسم السعري الاحترافي</h2>
									</div>
									<span className="muted">شموع · حجم · RSI · MACD</span>
								</div>
								<div
									className={`engine-status ${engineStatus?.live ? 'is-live' : 'is-fallback'}`}
								>
									<span aria-hidden="true" />
									{engineStatus?.live
										? 'Python Engine Live'
										: (engineStatus?.status ?? 'جاري التحقق من مصدر التحليل')}
								</div>
								<ProfessionalStockChart candles={data.candles} />
							</section>
							<section
								className="analysis-card elliott-mtf-panel"
								aria-label="تحليل Elliott متعدد الأطر"
							>
								<div className="panel-title">
									<div>
										<span className="eyebrow">هيكل الموجات · {normalized}</span>
										<h2>Elliott Wave متعدد الأطر الزمنية</h2>
									</div>
									<strong>
										{elliottMtf?.consensus?.direction === 'up'
											? 'ميل صاعد'
											: elliottMtf?.consensus?.direction === 'down'
												? 'ميل هابط'
												: 'توافق غير حاسم'}
									</strong>
								</div>
								<div className="elliott-mtf-grid">
									{Object.entries(elliottMtf?.by_timeframe ?? {}).map(
										([key, frame]) => (
											<article key={key} className="elliott-mtf-card">
												<span>{frame.timeframe_ar}</span>
												{frame.available === false ? (
													<strong>غير متاح: {frame.availability_reason}</strong>
												) : (
													<>
														<strong>
															الموجة {frame.current_wave} ·{' '}
															{frame.direction === 'up'
																? 'صاعد'
																: frame.direction === 'down'
																	? 'هابط'
																	: 'جانبي'}
														</strong>
														<small>{frame.wave_personality}</small>
														<small>
															الثقة {formatEnglishPercent(frame.confidence)} ·
															البديل {frame.alternate_count?.wave ?? '—'}
														</small>
														<small>
															هدف 1:{' '}
															{formatEnglishNumber(
																typeof frame.targets?.target_1 === 'object'
																	? frame.targets.target_1.price
																	: frame.targets?.target_1,
															)}{' '}
															· هدف 2:{' '}
															{formatEnglishNumber(
																typeof frame.targets?.target_2 === 'object'
																	? frame.targets.target_2.price
																	: frame.targets?.target_2,
															)}{' '}
															· إبطال:{' '}
															{formatEnglishNumber(
																frame.invalidation?.level ??
																	frame.invalidation_level?.level,
															)}
														</small>
														{frame.relationships?.wave2_retracement ? (
															<small>
																Fibonacci 2:{' '}
																{formatEnglishNumber(
																	frame.relationships.wave2_retracement.value,
																)}
																% ·{' '}
																{frame.relationships.wave2_retracement.valid
																	? 'متوافق'
																	: 'يحتاج تحقق'}
															</small>
														) : null}
													</>
												)}
											</article>
										),
									)}
								</div>
								<p className="analysis-disclaimer">
									{elliottMtf?.disclaimer ??
										'التحليل متعدد الأطر احتمالي وتعليمي، وليس توصية شراء أو بيع.'}
								</p>
							</section>
						</>
					) : (
						<section className="decision-tab-content">
							<BrilliantSummary symbol={normalized} market={market} />
							<div className="analysis-card decision-boundary-card">
								<h2>حدود القرار</h2>
								<p>
									هذا القسم يحول الأدلة الفنية إلى سيناريوهات مشروطة ومناطق
									مراقبة فقط. لا ينفذ صفقات ولا يقدم توصية استثمارية شخصية.
								</p>
								<div className="decision-boundary-grid">
									<strong>التأكيد: إغلاق مؤكد خارج المنطقة المهمة</strong>
									<strong>الإبطال: لا تعتمد على اختراق لحظي</strong>
									<strong>المخاطر: حدد الخسارة قبل أي قرار مستقل</strong>
								</div>
							</div>
						</section>
					)}
				</div>
			)}
		</main>
	)
}
