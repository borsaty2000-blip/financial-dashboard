import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useLivePrice, type LivePrice } from '../hooks/useLivePrice'
import TradingViewStockChart from '../components/TradingViewStockChart'
import { StockSectionBoundary } from '../components/StockSectionBoundary'
import { BrilliantSummary } from '../components/Analysis/BrilliantSummary'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'
import { useStockAnalysis } from '../hooks/useStockAnalysis'

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
	data_quality?: {
		status?: string
		provider?: string
		age_seconds?: number | null
		warnings?: string[]
	}
}

type Watchlist = { id: string; items: { symbol: string }[] }

type CompanyResponse = { nameAr?: string }

type ElliottFrame = {
	available?: boolean
	availability_reason?: string
	timeframe_ar?: string
	current_wave?: {
		number?: string
		direction?: string
		current_price?: number
		label?: string
		next_expected?: string
	} | string | null
	wave_personality?: string
	direction?: string
	confidence?: number
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
			{ value?: number; ratio?: number; valid?: boolean; label?: string; expected_range?: string }
		>
		waves?: Array<{ index?: number; date?: string; end_date?: string; number?: string; label?: string; wave?: string; direction?: string }>
	confidence_percent?: number
}

type ElliottMtfData = {
	by_timeframe?: Record<string, ElliottFrame>
	consensus?: { direction?: string; confidence?: number }
	disclaimer?: string
	source?: string
}

type GannAnalysis = {
	angles?: Record<string, { price?: number; status?: string }>
	square_of_nine?: { support?: number; resistance?: number; strong_support?: number; strong_resistance?: number; levels?: Record<string, number> }
	time_cycles?: Array<{ days?: number; date?: string; name?: string }>
	support_resistance?: { support?: number; pivot?: number; resistance?: number }
	trend?: string
	disclaimer?: string
}

type ConfluenceAnalysis = {
	bullish_confluence?: number
	bearish_confluence?: number
	supporting_evidence?: string[]
	contradicting_evidence?: string[]
	missing_data?: string[]
	disclaimer?: string
}

type EngineStatus = {
	python_engine?: { live?: boolean; status?: string; engines?: string[] }
}

function freshnessLabel(quote: LivePrice | null) {
	if (quote?.freshness === 'live') return 'محدّث الآن'
	if (quote?.dataQuality === 'historical' || quote?.freshness === 'cached') return 'تاريخي'
	return 'محدّث اليوم'
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
	const normalized = String(symbol ?? '').trim().toUpperCase() || 'UNKNOWN'
	const market =
		marketOverride ?? (/^\d{4,5}$/u.test(normalized) ? 'TASI' : 'EGX')
	const [data, setData] = useState<Candles | null>(null)
	const [resolvedCompanyName, setResolvedCompanyName] = useState<string>()
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [retryKey, setRetryKey] = useState(0)
	const [isPlaying, setIsPlaying] = useState(false)
	const [activeTab, setActiveTab] = useState<'technical' | 'decision'>(
		'technical',
	)
	const [elliottMtf, setElliottMtf] = useState<ElliottMtfData>()
	const [gann, setGann] = useState<GannAnalysis>()
	const [gannError, setGannError] = useState('')
	const [confluence, setConfluence] = useState<ConfluenceAnalysis>()
		const [confluenceError, setConfluenceError] = useState('')
		const [engineStatus, setEngineStatus] =
			useState<EngineStatus['python_engine']>()
		const livePrice = useLivePrice(normalized, market)
		const stockAnalysis = useStockAnalysis(normalized, market)

		useEffect(() => {
			if (!stockAnalysis.data) return
			setElliottMtf(stockAnalysis.data.elliott.data as ElliottMtfData | undefined)
			setGann(stockAnalysis.data.gann.data as GannAnalysis | undefined)
			setConfluence(stockAnalysis.data.confluence.data as ConfluenceAnalysis | undefined)
			setGannError(stockAnalysis.data.gann.error ?? '')
			setConfluenceError(stockAnalysis.data.confluence.error ?? '')
			setEngineStatus({
				live: stockAnalysis.data.integrity.score >= 80,
				status: stockAnalysis.data.integrity.score >= 80 ? 'التحليل متاح' : 'لا تتوفر قراءة موثوقة لهذا الرمز حالياً',
				engines: [
					...(stockAnalysis.data.elliott.available ? ['Elliott'] : []),
					...(stockAnalysis.data.gann.available ? ['Gann'] : []),
				],
			})
		}, [stockAnalysis.data])

	useEffect(() => {
		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 12_000)
		let cancelled = false
		void api<Candles>(
			`/api/market/candles/${normalized}?market=${market}&days=250`,
			{ signal: controller.signal },
		)
					.then((result) => {
						if (!cancelled) {
							const payload =
								Array.isArray(result?.candles)
									? result
									: (result as Candles & { data?: Candles })?.data ?? result
							const candles = Array.isArray(payload?.candles)
								? payload.candles.filter(
									(candle) =>
										candle &&
										Number.isFinite(candle.open) &&
										Number.isFinite(candle.high) &&
										Number.isFinite(candle.low) &&
										Number.isFinite(candle.close) &&
										Number.isFinite(candle.volume) &&
										Boolean(candle.date),
								  )
							: []
							setData({ ...payload, candles, count: candles.length })
					}
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
			return () => {
			cancelled = true
			controller.abort()
			window.clearTimeout(timeout)
		}
		}, [market, normalized, retryKey])

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
		const recommendation = stockAnalysis.data?.recommendation.data?.recommendation ?? stockAnalysis.data?.recommendation.data

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
				/* Browser speech is the intentional local alternative. */
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
						<span className="stock-company-name">{displayCompanyName ?? normalized}</span>
						<small className="stock-symbol-label" dir="ltr">{normalized}</small>
					</h1>
				</div>
				<div className="stock-header-quote" aria-label="السعر والتغير">
					<span>السعر الحالي</span>
						<strong>
								{formatEnglishNumber(livePrice?.price ?? stats.last?.close) ?? '—'}
						</strong>
					<b
						className={
							(livePrice?.changePercent ?? stats.changePercent) != null &&
							(livePrice?.changePercent ?? stats.changePercent)! >= 0
								? 'positive'
								: 'negative'
						}
					>
						{formatEnglishPercent(
							livePrice?.changePercent ?? stats.changePercent,
						)}
					</b>
						<small
							className="quote-freshness"
							title={livePrice?.warnings?.join(' ')}
						>
						<span
							className={`quote-status-dot ${livePrice?.freshness === 'live' ? 'is-live' : 'is-delayed'}`}
						/>
							{freshnessLabel(livePrice)}
					</small>
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
				<section className="analysis-card data-quality-strip" aria-label="بيانات السعر">
						<div><span className="eyebrow">السعر</span><strong>{formatEnglishNumber(livePrice?.price ?? stats.last?.close) ?? '—'}</strong></div>
						<div><span className="eyebrow">التغير</span><strong>{formatEnglishPercent(livePrice?.changePercent ?? stats.changePercent)}</strong></div>
						<div><span className="eyebrow">آخر تحديث</span><strong>{freshnessLabel(livePrice)}</strong></div>
				</section>
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
						<strong>تعذر تحميل بيانات هذا السهم</strong>
						<p>تحقق من الاتصال أو أعد المحاولة. سيبقى اسم الشركة والرمز محفوظين.</p>
						<button className="primary-button" type="button" onClick={() => { setMessage(''); setLoading(true); setRetryKey((key) => key + 1) }}>
							إعادة تحميل البيانات
						</button>
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
										{engineStatus?.live && <div className="engine-status is-live"><span aria-hidden="true" />التحليل متاح</div>}
									<StockSectionBoundary label="الرسم السعري">
										<TradingViewStockChart
											candles={data.candles}
											symbol={normalized}
											market={market}
											analysis={stockAnalysis.data ?? undefined}
										/>
									</StockSectionBoundary>
							</section>
						{stockAnalysis.data?.elliott.available && elliottMtf && <StockSectionBoundary label="تحليل Elliott">
							<section className="analysis-card elliott-mtf-panel" aria-label="تحليل Elliott متعدد الأطر">
								<div className="panel-title">
									<div><span className="eyebrow">هيكل الموجات · {normalized}</span><h2>Elliott Wave متعدد الأطر الزمنية</h2></div>
									<strong className={elliottMtf.consensus?.direction === 'up' ? 'up' : elliottMtf.consensus?.direction === 'down' ? 'down' : 'neutral'}>
										{elliottMtf.consensus?.direction === 'up' ? 'ميل صاعد' : elliottMtf.consensus?.direction === 'down' ? 'ميل هابط' : 'توافق جانبي'}
									</strong>
								</div>
								<div className="elliott-table-scroll">
									<table className="elliott-mtf-table">
										<thead><tr><th>الفريم</th><th>الموجة</th><th>الاتجاه</th><th>الثقة</th><th>الهدف 1</th><th>الهدف 2</th><th>الإبطال</th></tr></thead>
										<tbody>{Object.entries(elliottMtf.by_timeframe ?? {}).map(([key, frame]) => {
											const wave = typeof frame.current_wave === 'object' && frame.current_wave ? frame.current_wave.label ?? (frame.current_wave.number ? `الموجة ${frame.current_wave.number}` : '—') : frame.current_wave ?? '—'
											const rawDirection = frame.direction ?? (frame.current_wave && typeof frame.current_wave === 'object' ? frame.current_wave.direction : undefined)
											const direction = rawDirection === 'up' ? 'صاعد' : rawDirection === 'down' ? 'هابط' : 'جانبي'
											const timeframeLabel = frame.timeframe_ar ?? ({ daily: 'يومي', weekly: 'أسبوعي', monthly: 'شهري' } as Record<string, string>)[key] ?? key
											const target = (value: number | { price?: number } | undefined) => typeof value === 'object' ? value?.price : value
											return <tr key={key} className={frame.available === false ? 'is-unavailable' : undefined}><td className="tf-name">{timeframeLabel}</td><td className="wave-label">{wave}</td><td className={rawDirection === 'up' ? 'up' : rawDirection === 'down' ? 'down' : 'neutral'}>{direction}</td><td className="confidence">{frame.confidence == null ? '—' : `${Math.round(frame.confidence * 100)}%`}</td><td className="target">{formatEnglishNumber(target(frame.targets?.target_1))}</td><td className="target">{formatEnglishNumber(target(frame.targets?.target_2))}</td><td className="invalidation">{formatEnglishNumber(frame.invalidation?.level ?? frame.invalidation_level?.level)}</td></tr>
										})}</tbody>
									</table>
								</div>
								<div className="elliott-insights">
									<div className="insight"><span>شخصية الموجة</span><strong>{elliottMtf.by_timeframe?.daily?.wave_personality || '—'}</strong></div>
									{elliottMtf.by_timeframe?.daily?.alternate_count && <div className="insight alternate"><span>العد البديل</span><strong>الموجة {typeof elliottMtf.by_timeframe.daily.alternate_count === 'object' ? elliottMtf.by_timeframe.daily.alternate_count.wave ?? '—' : elliottMtf.by_timeframe.daily.alternate_count}</strong></div>}
									{elliottMtf.consensus && <div className="insight consensus"><span>الإجماع</span><strong className={elliottMtf.consensus.direction === 'up' ? 'up' : elliottMtf.consensus.direction === 'down' ? 'down' : 'neutral'}>{elliottMtf.consensus.direction === 'up' ? 'صاعد' : elliottMtf.consensus.direction === 'down' ? 'هابط' : 'جانبي'} ({Math.round((elliottMtf.consensus.confidence ?? 0) * 100)}%)</strong></div>}
								</div>
								{elliottMtf.by_timeframe?.daily?.relationships && <div className="fib-relationships"><h4>علاقات فيبوناتشي</h4><div className="fib-grid">{Object.entries(elliottMtf.by_timeframe.daily.relationships).map(([key, rel]) => <div key={key} className={`fib-item ${rel.valid ? 'valid' : 'invalid'}`}><div className="fib-label">{rel.label ?? key}</div><div className="fib-value"><span className="number">{formatEnglishNumber(rel.value ?? rel.ratio)}</span><span className="expected">{rel.expected_range ?? '—'}</span></div><div className={`fib-status ${rel.valid ? 'ok' : 'warn'}`}>{rel.valid ? '✓ متوافق' : '⚠ يحتاج تحقق'}</div></div>)}</div></div>}
								<p className="analysis-disclaimer">إخلاء مسؤولية: هذه مخرجات تحليلية احتمالية وليست توصية شراء أو بيع.</p>
							</section>
						</StockSectionBoundary>}
						{stockAnalysis.data?.gann.available && gann && <StockSectionBoundary label="تحليل Gann">
						<section className="analysis-card gann-analysis-panel" aria-label="تحليل Gann">
							<div className="panel-title">
								<div><span className="eyebrow">الزوايا والدورات · {normalized}</span><h2>تحليل Gann السعري والزمني</h2></div>
								<strong>{gann?.trend ?? 'قيد التحميل'}</strong>
							</div>
								{gann ? (
									<>
										<div className="decision-boundary-grid">
											<strong>الدعم: {formatEnglishNumber(gann.support_resistance?.support ?? gann.square_of_nine?.support)}</strong>
											<strong>المحور: {formatEnglishNumber(gann.support_resistance?.pivot)}</strong>
											<strong>المقاومة: {formatEnglishNumber(gann.support_resistance?.resistance ?? gann.square_of_nine?.resistance)}</strong>
										</div>
										<table className="gann-angles-table">
											<thead>
												<tr><th>الزاوية</th><th>السعر</th><th>العلاقة</th></tr>
											</thead>
											<tbody>
												{Object.entries(gann.angles ?? {}).map(([key, angle]) => (
													<tr key={key}>
														<td className="angle-name" dir="ltr">{key}</td>
														<td className="angle-price mono">{angle.price == null ? '—' : angle.price.toFixed(2)}</td>
														<td className={angle.status === 'أعلى' ? 'up' : 'down'}>{angle.status || '—'}</td>
													</tr>
												))}
											</tbody>
										</table>
										<div className="decision-boundary-grid">
											<strong>مربع التسعة — دعم: {formatEnglishNumber(gann.square_of_nine?.support)}</strong>
											<strong>مربع التسعة — مقاومة: {formatEnglishNumber(gann.square_of_nine?.resistance)}</strong>
											<strong>المستويات: {Object.keys(gann.square_of_nine?.levels ?? {}).length}</strong>
										</div>
										<div className="gann-cycles" aria-label="الدورات الزمنية">
											{(gann.time_cycles ?? []).map((cycle) => <span key={`${cycle.days}-${cycle.date}`}>{cycle.name ?? `${cycle.days} يوم`} · {cycle.date}</span>)}
										</div>
									</>
							) : gannError ? (
								<div className="analysis-error" role="alert">تعذر تحميل تحليل Gann: {gannError}<button className="link-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>إعادة المحاولة</button></div>
							) : <p>جاري تحميل الزوايا والمستويات الزمنية...</p>}
									<p className="analysis-disclaimer">إخلاء مسؤولية: هذه مستويات احتمالية وليست توصية شراء أو بيع.</p>
							</section>
						</StockSectionBoundary>}
							</>
						) : (
							<section className="decision-tab-content">
									{stockAnalysis.data?.confluence.available && confluence && (
									<section className="analysis-card decision-evidence-card" aria-label="توافق الأدلة والسيناريو">
										<div className="panel-title"><div><span className="eyebrow">توافق الأدلة</span><h2>القراءة المجمعة للسهم</h2></div><strong>{formatEnglishNumber(confluence.bullish_confluence)} / 100</strong></div>
										<p>{confluence.supporting_evidence?.join(' · ') ?? 'تم جمع المؤشرات والموجات ومستويات السعر.'}</p>
										<div className="decision-boundary-grid"><strong>التعارضات: {confluence.contradicting_evidence?.length ?? 0}</strong><strong>البيانات الناقصة: {confluence.missing_data?.length ?? 0}</strong><strong>الاتجاه المقابل: {formatEnglishNumber(confluence.bearish_confluence)} / 100</strong></div>
									</section>
								)}
									{confluenceError && !confluence && <div className="analysis-error" role="alert">تعذر تحميل توافق الأدلة: {confluenceError}<button className="link-button" type="button" onClick={() => setRetryKey((key) => key + 1)}>إعادة المحاولة</button></div>}
									{stockAnalysis.data?.recommendation.available && recommendation && (
										<section className="analysis-card recommendation-card" aria-label="التوصية المشروطة">
											<div className="panel-title"><div><span className="eyebrow">مخرجات Orchestrator</span><h2>القرار المشروط</h2></div><strong>{recommendation.type ?? 'سيناريو مراقبة'}</strong></div>
											<p>{recommendation.condition ?? 'تُراجع الإشارة عند تحقق شروط السعر والحجم.'}</p>
											<div className="decision-boundary-grid">
												<strong>منطقة الدخول: {Array.isArray(recommendation.entry_zone) ? recommendation.entry_zone.map((value: number) => formatEnglishNumber(value)).join(' – ') : formatEnglishNumber(recommendation.entry)}</strong>
												<strong>وقف الخسارة: {formatEnglishNumber(recommendation.stop_loss)}</strong>
												<strong>المخاطرة/العائد: {formatEnglishNumber(recommendation.risk_reward)}</strong>
											</div>
											<div className="decision-boundary-grid">
												{(recommendation.targets ?? []).map((target: { price?: number }, index: number) => <strong key={`${target.price}-${index}`}>الهدف {index + 1}: {formatEnglishNumber(target.price)}</strong>)}
											</div>
										</section>
									)}
									<StockSectionBoundary label="الملخص الموحد">
									<BrilliantSummary symbol={normalized} market={market} />
								</StockSectionBoundary>
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
