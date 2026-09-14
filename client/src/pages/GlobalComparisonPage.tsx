import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function GlobalComparisonPage() {
	const [period, setPeriod] = useState('1Y')
	const [data, setData] = useState<any>(null)
	useEffect(() => {
		void api(`/api/comparison/global?period=${period}`)
			.then(setData)
			.catch(() => setData(null))
	}, [period])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Global Comparison</p>
				<h1>مقارنة الأسواق</h1>
				<select value={period} onChange={(e) => setPeriod(e.target.value)}>
					<option value="1M">شهر</option>
					<option value="3M">3 أشهر</option>
					<option value="6M">6 أشهر</option>
					<option value="1Y">سنة</option>
				</select>
			</header>
			<section className="analysis-card">
				<div className="comparison-bars">
					{data?.data?.map((item: any) => (
						<div className="comparison-bar" key={item.key}>
							<span>{item.name}</span>
							<b
								style={{
									width: `${Math.min(100, Math.max(4, Math.abs(item.changePercent) * 8))}%`,
									background: item.changePercent >= 0 ? '#00a651' : '#e74c3c',
								}}
							>
								{item.changePercent.toFixed(2)}%
							</b>
						</div>
					)) ?? <p>لا تتوفر سلاسل موحدة للفترة.</p>}
				</div>
				<small>{data?.disclaimer}</small>
			</section>
		</main>
	)
}
