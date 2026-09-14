import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function DigitalTwinPage() {
	const [data, setData] = useState<any>(null)
	useEffect(() => {
		const raw = localStorage.getItem('borsaty_user')
		const user = raw ? JSON.parse(raw) : null
		if (user?.id)
			void api(`/api/twin/${user.id}`)
				.then(setData)
				.catch(() => undefined)
	}, [])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Digital Twin</p>
				<h1>توأمك الرقمي</h1>
				<p>ملخص سلوكي تعليمي مبني على سجل الأوامر المتاح.</p>
			</header>
			{data ? (
				<section className="analysis-card">
					<div className="metric-grid">
						<div>
							<span>فترة الاحتفاظ</span>
							<strong>
								{data.behavior.avgHoldingPeriod?.toFixed?.(1) ?? '—'} يوم
							</strong>
						</div>
						<div>
							<span>متوسط الشراء</span>
							<strong>{data.behavior.avgBuyAmount?.toFixed?.(2) ?? '—'}</strong>
						</div>
						<div>
							<span>نسبة النجاح</span>
							<strong>{Math.round((data.behavior.winRate ?? 0) * 100)}%</strong>
						</div>
					</div>
					<h2>الرؤى</h2>
					{data.insights?.map((item: string) => (
						<p key={item}>{item}</p>
					))}
					<h2>التوصيات التعليمية</h2>
					{data.recommendations?.map((item: string) => (
						<p key={item}>{item}</p>
					))}
					<small>{data.disclaimer}</small>
				</section>
			) : (
				<div className="analysis-card">سجّل الدخول لرؤية التوأم الرقمي.</div>
			)}
		</main>
	)
}
