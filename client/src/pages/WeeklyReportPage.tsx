import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function WeeklyReportPage() {
	const [report, setReport] = useState<any>(null)
	const [history, setHistory] = useState<any[]>([])
	useEffect(() => {
		void api('/api/reports/weekly')
			.then(setReport)
			.catch(() => undefined)
		void api<any[]>('/api/reports/weekly/history')
			.then((value) => setHistory(value))
			.catch(() => undefined)
	}, [])
	return (
		<main className="analysis-page weekly-report-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Weekly Digest</p>
				<h1>تقريرك الأسبوعي</h1>
				<div className="form-actions">
					<button className="secondary-button" onClick={() => window.print()}>
						طباعة
					</button>
					<a className="primary-button" href="/api/reports/weekly/pdf" download>
						📄 تحميل PDF
					</a>
				</div>
			</header>
			{report ? (
				<section className="analysis-card">
					<div className="metric-grid">
						<div>
							<span>التاريخ</span>
							<strong>{report.period}</strong>
						</div>
						<div>
							<span>قيمة المحفظة</span>
							<strong>
								{report.portfolio?.totalValue?.toLocaleString?.() ?? '—'}
							</strong>
						</div>
						<div>
							<span>الفرص المرصودة</span>
							<strong>{report.opportunities?.length ?? 0}</strong>
						</div>
					</div>
					<h2>الفرص</h2>
					{report.opportunities?.map((item: any) => (
						<p key={item.symbol}>
							{item.symbol}:{' '}
							{item.changePercent == null
								? '—'
								: `${item.changePercent.toFixed(2)}%`}
						</p>
					))}
					<h2>المخاطر والتنبيهات</h2>
					{report.risks?.length ? (
						report.risks.map((item: any, index: number) => (
							<p key={`${item.symbol}-${index}`}>
								{item.symbol}: {item.condition}
							</p>
						))
					) : (
						<p>لا توجد تنبيهات نشطة.</p>
					)}
					<small>{report.disclaimer}</small>
				</section>
			) : (
				<div className="analysis-card">جارٍ تحميل التقرير…</div>
			)}
			<section className="analysis-card">
				<h2>السجل</h2>
				{history.map((item) => (
					<p key={item.id}>
						{new Date(item.createdAt).toLocaleDateString('ar-EG-u-nu-latn')} —{' '}
						{item.data?.period}
					</p>
				))}
			</section>
		</main>
	)
}
