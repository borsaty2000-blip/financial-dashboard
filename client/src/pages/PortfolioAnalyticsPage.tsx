import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function PortfolioAnalyticsPage() {
	const [data, setData] = useState<any>(null)
	useEffect(() => {
		void api('/api/portfolio/analytics')
			.then(setData)
			.catch(() => undefined)
	}, [])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Portfolio Analytics</p>
				<h1>تحليل المحفظة</h1>
			</header>
			<section className="analysis-card">
				<div className="metric-grid">
					{[
						['Sharpe', data?.metrics?.sharpeRatio],
						['Sortino', data?.metrics?.sortinoRatio],
						['Max Drawdown', data?.metrics?.maxDrawdown],
						['Beta مقابل EGX30', data?.metrics?.betaVsEGX30],
						['Alpha', data?.metrics?.alpha],
						['العائد الكلي', data?.metrics?.totalReturn],
					].map(([label, value]) => (
						<div key={String(label)}>
							<span>{label}</span>
							<strong>
								{value == null
									? '—'
									: `${(Number(value) * (String(label).includes('Drawdown') || String(label).includes('العائد') || String(label) === 'Alpha' ? 100 : 1)).toFixed(2)}${String(label).includes('Drawdown') || String(label).includes('العائد') || String(label) === 'Alpha' ? '%' : ''}`}
							</strong>
						</div>
					))}
				</div>
				<div className="equity-curve">
					{data?.equityCurve?.map((point: any) => (
						<span
							key={point.index}
							style={{
								left: `${(point.index / Math.max(data.equityCurve.length, 1)) * 100}%`,
								bottom: `${Math.min(94, Math.max(4, (point.value - 0.8) * 220))}%`,
							}}
						/>
					))}
				</div>
				<small>
					{data?.disclaimer ?? 'سجّل الدخول لرؤية تحليلات المحفظة.'}
				</small>
			</section>
		</main>
	)
}
