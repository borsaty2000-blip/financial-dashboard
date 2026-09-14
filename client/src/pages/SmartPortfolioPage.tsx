import { useState } from 'react'
import { api } from '../lib/api'

export function SmartPortfolioPage() {
	const [riskProfile, setRiskProfile] = useState('BALANCED')
	const [data, setData] = useState<any>(null)
	const [loading, setLoading] = useState(false)
	async function load(path = '/api/portfolio/smart') {
		setLoading(true)
		try {
			setData(await api(path))
		} finally {
			setLoading(false)
		}
	}
	return (
		<main className="analysis-page smart-portfolio-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">AI Portfolio</p>
				<h1>المحفظة الذكية</h1>
				<p>خطة توزيع افتراضية قابلة للمراجعة، دون تنفيذ تلقائي.</p>
			</header>
			<section className="analysis-card simulator-form">
				<label>
					ملف المخاطر
					<select
						value={riskProfile}
						onChange={(e) => setRiskProfile(e.target.value)}
					>
						<option value="CONSERVATIVE">محافظ</option>
						<option value="BALANCED">متوازن</option>
						<option value="AGGRESSIVE">جريء</option>
					</select>
				</label>
				<button
					className="primary-button"
					disabled={loading}
					onClick={() => void load('/api/portfolio/smart/create')}
				>
					إنشاء/تحديث الخطة
				</button>
				<button
					className="secondary-button"
					disabled={loading}
					onClick={() =>
						void load(
							`/api/portfolio/smart/rebalance?riskProfile=${riskProfile}`,
						)
					}
				>
					خطة إعادة التوازن
				</button>
			</section>
			{data && (
				<section className="analysis-card">
					<div
						className="allocation-ring"
						style={{
							background: `conic-gradient(#0071bc 0 ${data.allocation?.stocks ?? 0}%, #f39c12 ${data.allocation?.stocks ?? 0}% ${(data.allocation?.stocks ?? 0) + (data.allocation?.gold ?? 0)}%, #98a2b3 ${(data.allocation?.stocks ?? 0) + (data.allocation?.gold ?? 0)}% 100%)`,
						}}
					>
						<span>{data.riskProfile ?? riskProfile}</span>
					</div>
					<div className="metric-grid">
						<div>
							<span>الأسهم</span>
							<strong>{data.allocation?.stocks ?? '—'}%</strong>
						</div>
						<div>
							<span>الذهب</span>
							<strong>{data.allocation?.gold ?? '—'}%</strong>
						</div>
						<div>
							<span>النقد</span>
							<strong>{data.allocation?.cash ?? '—'}%</strong>
						</div>
					</div>
					<p>{data.recommendation}</p>
					<small>{data.disclaimer}</small>
				</section>
			)}
		</main>
	)
}
