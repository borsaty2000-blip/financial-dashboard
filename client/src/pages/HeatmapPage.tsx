import { useCallback, useEffect, useState } from 'react'
import { BarChart3, RefreshCw } from 'lucide-react'
import { navigate } from '../router'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'

type HeatmapStock = {
	symbol: string
	canonicalSymbol: string
	name: string
	price: number
	changePercent: number | null
	freshness?: string
}
type HeatmapResponse = {
	status: string
	market: 'EGX' | 'TASI'
	stocks: HeatmapStock[]
	coverage?: { requested: number; available: number }
	note?: string
}

const colorFor = (change: number | null) => {
	if (change == null) return '#64748b'
	if (change >= 3) return '#087f5b'
	if (change >= 1) return '#159a70'
	if (change >= 0) return '#4b9f76'
	if (change >= -1) return '#c48624'
	if (change >= -3) return '#c65a3a'
	return '#a73545'
}

export function HeatmapPage() {
	const [market, setMarket] = useState<'EGX' | 'TASI'>('EGX')
	const [data, setData] = useState<HeatmapResponse | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	const load = useCallback(() => {
		setLoading(true)
		setError('')
		fetch(`/api/v1/market/heatmap?market=${market}`, {
			headers: { accept: 'application/json' },
			cache: 'no-store',
		})
			.then(async (response) => {
				if (!response.ok) throw new Error('unavailable')
				return (await response.json()) as HeatmapResponse
			})
			.then(setData)
			.catch(() => setError('تعذر تحميل الأسهم المتاحة للخريطة حالياً'))
			.finally(() => setLoading(false))
	}, [market])

	useEffect(() => {
		const timer = window.setTimeout(load, 0)
		return () => window.clearTimeout(timer)
	}, [load])

	return (
		<main className="heatmap-page" dir="rtl">
			<header className="heatmap-header">
				<div>
					<span className="eyebrow">BORSATYAI · MARKET PULSE</span>
					<h1>خريطة السوق الحرارية</h1>
					<p>لقطة بصرية للأسهم التي تتوفر لها أسعار وتغيرات فعلية فقط.</p>
				</div>
				<button
					className="icon-button"
					onClick={load}
					aria-label="تحديث الخريطة"
				>
					<RefreshCw size={18} />
				</button>
			</header>
			<nav className="heatmap-tabs" aria-label="اختيار السوق">
				<button
					className={market === 'EGX' ? 'active' : ''}
					onClick={() => setMarket('EGX')}
				>
					مصر · EGX
				</button>
				<button
					className={market === 'TASI' ? 'active' : ''}
					onClick={() => setMarket('TASI')}
				>
					السعودية · TASI
				</button>
			</nav>
			{loading && (
				<div className="heatmap-empty">جارٍ تحميل البيانات المتاحة...</div>
			)}
			{error && <div className="heatmap-empty error">{error}</div>}
			{!loading && !error && data?.stocks.length === 0 && (
				<div className="heatmap-empty">
					لا توجد أسعار متاحة كافية لبناء الخريطة حالياً.
				</div>
			)}
			{!loading && !error && Boolean(data?.stocks.length) && (
				<section className="heatmap-grid" aria-label="أسهم السوق">
					{data?.stocks.map((stock) => (
						<button
							key={stock.canonicalSymbol}
							className="heatmap-tile"
							style={{ background: colorFor(stock.changePercent) }}
							onClick={() =>
								navigate(
									`/stock/${encodeURIComponent(stock.canonicalSymbol)}?market=${market}&name=${encodeURIComponent(stock.name)}`,
								)
							}
						>
							<strong>{stock.symbol}</strong>
							<span>{stock.name}</span>
							<b dir="ltr">{formatEnglishNumber(stock.price)}</b>
							<em dir="ltr">{formatEnglishPercent(stock.changePercent)}</em>
							<BarChart3 size={15} aria-hidden="true" />
						</button>
					))}
				</section>
			)}
			<footer className="heatmap-note">
				{data?.coverage
					? `متاح ${data.coverage.available} من ${data.coverage.requested} رمزاً ضمن اللقطة المحدودة.`
					: ''}
				{data?.note}
			</footer>
		</main>
	)
}
