import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'

type Candle = { date: string; close: number; volume: number }
type Candles = {
	symbol: string
	candles: Candle[]
	count: number
	freshness?: 'live' | 'delayed' | 'cached'
}
type Watchlist = { id: string; items: { symbol: string }[] }
type FeatureResponse = {
	data?: any
	forecast?: number[]
	confidence?: number
	articleCount?: number
	distribution?: Record<string, number>
	latest?: boolean
	anomalyCount?: number
}

export function StockDetailPage({ symbol }: { symbol: string }) {
	const [data, setData] = useState<Candles | null>(null)
	const [ensembleData, setEnsembleData] = useState<FeatureResponse | null>(null)
	const [sentimentData, setSentimentData] = useState<FeatureResponse | null>(
		null,
	)
	const [anomalyData, setAnomalyData] = useState<FeatureResponse | null>(null)
	const [fundamentals, setFundamentals] = useState<any>(null)
	const [insiderTrades, setInsiderTrades] = useState<any[]>([])
	const [ownership, setOwnership] = useState<any>(null)
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(false)
	const normalized = symbol.toUpperCase()
	const livePrice = useLivePrice(normalized)

	useEffect(() => {
		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 12_000)
		let cancelled = false
		void api<Candles>(`/api/market/candles/${normalized}?days=120`, {
			signal: controller.signal,
		})
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
		void api<any>(`/api/fundamentals/${normalized}`)
			.then(setFundamentals)
			.catch(() => undefined)
		void api<{ data: any[] }>(`/api/insider-trades/${normalized}`)
			.then((result) => setInsiderTrades(result.data))
			.catch(() => undefined)
		void api<any>(`/api/ownership/${normalized}`)
			.then(setOwnership)
			.catch(() => undefined)
		return () => {
			cancelled = true
			controller.abort()
			window.clearTimeout(timeout)
		}
	}, [normalized])

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

	async function addToWatchlist() {
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
	async function listen() {
		const text = `السعر الحالي لسهم ${normalized} هو ${stats.last?.close?.toFixed(2) ?? 'غير متاح'}. التغير ${stats.changePercent?.toFixed(2) ?? 'غير متاح'} بالمئة.`
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

	return (
		<main className="stock-detail-page" dir="rtl">
			<header className="stock-detail-header">
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
								{livePrice?.price?.toFixed(2) ??
									stats.last?.close.toFixed(2) ??
									'—'}
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
							{stats.changePercent == null
								? '—'
								: `${stats.changePercent.toFixed(2)}%`}
						</div>
					</section>
					<section className="stock-stats-grid">
						<div>
							<span>أعلى فترة</span>
							<b>{stats.high?.toFixed(2) ?? '—'}</b>
						</div>
						<div>
							<span>أدنى فترة</span>
							<b>{stats.low?.toFixed(2) ?? '—'}</b>
						</div>
						<div>
							<span>عدد الشموع</span>
							<b>{data.count}</b>
						</div>
						<div>
							<span>آخر حجم</span>
							<b>{stats.last?.volume?.toLocaleString() ?? '—'}</b>
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
					<section className="analysis-card stock-ai-grid">
						<div>
							<span className="eyebrow">Ensemble Prediction</span>
							<strong>{ai?.forecast?.[0]?.toFixed?.(2) ?? '—'}</strong>
							<small>ثقة مجمعة: {ai?.confidence ?? '—'}%</small>
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
							{[
								['P/E', fundamentals?.keyRatios?.peRatio],
								['EPS', fundamentals?.keyRatios?.eps],
								['القيمة السوقية', fundamentals?.keyRatios?.marketCap],
								['عائد التوزيعات', fundamentals?.keyRatios?.dividendYield],
								['أعلى 52 أسبوعاً', fundamentals?.keyRatios?.fiftyTwoWeekHigh],
								['أدنى 52 أسبوعاً', fundamentals?.keyRatios?.fiftyTwoWeekLow],
							].map(([label, value]) => (
								<div key={String(label)}>
									<span>{label}</span>
									<strong>
										{value == null
											? '—'
											: typeof value === 'number'
												? value.toLocaleString('en-US', {
														maximumFractionDigits: 2,
													})
												: String(value)}
									</strong>
								</div>
							))}
						</div>
						{fundamentals?.incomeStatement?.length ? (
							<div className="fundamentals-table">
								{fundamentals.incomeStatement
									.slice(0, 5)
									.map((item: any, index: number) => (
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
							{(ownership?.shareholders ?? []).map((item: any) => (
								<div key={item.name}>
									<span>{item.name}</span>
									<b>{item.percentage == null ? '—' : `${item.percentage}%`}</b>
								</div>
							))}
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
									<b>{item.shares.toLocaleString()}</b>
								</div>
							))}
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
