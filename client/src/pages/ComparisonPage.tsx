import { useState } from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'

type Row = {
	symbol: string
	currentPrice: number
	changePercent: number
	volume: number
	rsi: number | null
	macd: { value: number | null; signal: string }
	sma20: number | null
	sma50: number | null
	sma200: number | null
	volatility: number
	performance: Record<string, number>
}
type Result = {
	data: Row[]
	winner: { bestPerformance: string; bestRSI: string; bestTrend: string } | null
}
export function ComparisonPage() {
	const [symbols, setSymbols] = useState(['COMI', 'ABUK', 'ETEL', 'SWDY'])
	const [result, setResult] = useState<Result | null>(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	async function compare() {
		const selected = symbols.map((value) => value.trim()).filter(Boolean)
		if (selected.length < 2) return setError('اختر سهمين على الأقل')
		setLoading(true)
		setError('')
		try {
			setResult(
				await api<Result>(
					`/api/comparison?symbols=${encodeURIComponent(selected.join(','))}`,
				),
			)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر المقارنة')
		} finally {
			setLoading(false)
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="analysis-page-header">
				<button className="link-button" onClick={() => navigate('/')}>
					العودة
				</button>
				<div>
					<p className="eyebrow">Side by Side</p>
					<h1>مقارنة الأسهم</h1>
					<p>قارن السعر، المؤشرات، التقلب والأداء التاريخي بين 2 و4 أسهم.</p>
				</div>
			</header>
			<section className="analysis-controls comparison-inputs">
				{symbols.map((symbol, index) => (
					<label key={index}>
						السهم {index + 1}
						<input
							value={symbol}
							onChange={(event) =>
								setSymbols((current) =>
									current.map((item, itemIndex) =>
										itemIndex === index
											? event.target.value.toUpperCase()
											: item,
									),
								)
							}
						/>
					</label>
				))}
				<button className="primary-button" disabled={loading} onClick={compare}>
					{loading ? 'جارٍ التحليل...' : 'قارن الآن'}
				</button>
			</section>
			{error && <div className="analysis-error">{error}</div>}
			{result && (
				<>
					<section className="comparison-winners">
						<b>أفضل أداء شهري: {result.winner?.bestPerformance ?? '—'}</b>
						<b>أفضل RSI متوازن: {result.winner?.bestRSI ?? '—'}</b>
						<b>أفضل اتجاه: {result.winner?.bestTrend ?? '—'}</b>
					</section>
					<section className="analysis-card comparison-table-wrap">
						<table className="comparison-table">
							<thead>
								<tr>
									<th>الرمز</th>
									<th>السعر</th>
									<th>التغير %</th>
									<th>RSI</th>
									<th>MACD</th>
									<th>SMA 20</th>
									<th>SMA 50</th>
									<th>SMA 200</th>
									<th>تقلب سنوي</th>
									<th>أداء 1M</th>
								</tr>
							</thead>
							<tbody>
								{result.data.map((row) => (
									<tr key={row.symbol}>
										<td>
											<b>{row.symbol}</b>
										</td>
										<td>{row.currentPrice.toFixed(2)}</td>
										<td
											className={
												row.changePercent >= 0 ? 'positive' : 'negative'
											}
										>
											{row.changePercent.toFixed(2)}%
										</td>
										<td>{row.rsi?.toFixed(1) ?? '—'}</td>
										<td>{row.macd.signal}</td>
										<td>{row.sma20?.toFixed(2) ?? '—'}</td>
										<td>{row.sma50?.toFixed(2) ?? '—'}</td>
										<td>{row.sma200?.toFixed(2) ?? '—'}</td>
										<td>{row.volatility.toFixed(2)}%</td>
										<td>{row.performance['1m'].toFixed(2)}%</td>
									</tr>
								))}
							</tbody>
						</table>
						<div className="comparison-cards">
							{result.data.map((row) => (
								<article
									className="comparison-card"
									key={`mobile-${row.symbol}`}
								>
									<div className="comparison-card-head">
										<b>{row.symbol}</b>
										<strong>{row.currentPrice.toFixed(2)}</strong>
									</div>
									<div className="comparison-card-row">
										<span>التغير</span>
										<b
											className={
												row.changePercent >= 0 ? 'positive' : 'negative'
											}
										>
											{row.changePercent.toFixed(2)}%
										</b>
									</div>
									<div className="comparison-card-row">
										<span>RSI</span>
										<b>{row.rsi?.toFixed(1) ?? '—'}</b>
									</div>
									<div className="comparison-card-row">
										<span>الاتجاه</span>
										<b>{row.macd.signal}</b>
									</div>
									<div className="comparison-card-row">
										<span>أداء شهر</span>
										<b>{row.performance['1m'].toFixed(2)}%</b>
									</div>
								</article>
							))}
						</div>
					</section>
				</>
			)}
		</main>
	)
}
