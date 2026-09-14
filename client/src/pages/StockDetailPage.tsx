import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type Candle = { date: string; close: number; volume: number }
type Candles = { symbol: string; candles: Candle[]; count: number }
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
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const normalized = symbol.toUpperCase()

	useEffect(() => {
		void api<Candles>(`/api/market/candles/${normalized}?days=120`)
			.then(setData)
			.catch(() => setMessage('لا تتوفر بيانات تاريخية حالياً'))
			.finally(() => setLoading(false))
		void api<FeatureResponse>(`/api/analysis/${normalized}/ensemble?steps=7`)
			.then(setEnsembleData)
			.catch(() => undefined)
		void api<FeatureResponse>(`/api/analysis/${normalized}/sentiment`)
			.then(setSentimentData)
			.catch(() => undefined)
		void api<FeatureResponse>(`/api/analysis/${normalized}/anomalies`)
			.then(setAnomalyData)
			.catch(() => undefined)
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
				<button className="primary-button" onClick={addToWatchlist}>
					＋ أضف إلى قائمتي
				</button>
			</header>
			{loading && (
				<div className="stock-detail-skeleton">
					<i />
					<i />
					<i />
				</div>
			)}
			{message && <div className="analysis-error">{message}</div>}
			{data && !loading && (
				<>
					<section className="stock-hero-card">
						<div>
							<span>السعر الحالي</span>
							<strong>{stats.last?.close.toFixed(2) ?? '—'}</strong>
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
				</>
			)}
		</main>
	)
}
