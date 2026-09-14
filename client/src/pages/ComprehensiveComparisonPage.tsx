import { useEffect, useState } from 'react'
import { api } from '../lib/api'
type Kind = 'sectors' | 'periods' | 'watchlist'
export function ComprehensiveComparisonPage({ kind }: { kind: Kind }) {
	const [data, setData] = useState<any>(null)
	const endpoint = `/api/comparison/${kind}`
	useEffect(() => {
		void api(endpoint)
			.then(setData)
			.catch(() => setData({ data: [], available: false }))
	}, [endpoint])
	const rows = data?.data ?? []
	return (
		<main className="analysis-page comparison-tools-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Comparison</p>
				<h1>
					{kind === 'sectors'
						? 'مقارنة القطاعات'
						: kind === 'periods'
							? 'مقارنة الفترات'
							: 'مقارنة قائمة المتابعة'}
				</h1>
			</header>
			<section className="analysis-card comparison-tools-grid">
				{rows.map((row: any, index: number) => (
					<article key={row.sector ?? row.period ?? row.symbol ?? index}>
						<b>{row.sector ?? row.period ?? row.symbol}</b>
						<strong>
							{row.performancePercent == null
								? '—'
								: `${row.performancePercent.toFixed(2)}%`}
						</strong>
						<span>
							{row.companyCount
								? `${row.companyCount} شركة`
								: row.returnPercent == null
									? `Average P/E: ${row.averagePE ?? '—'}`
									: `السعر ${row.price?.toFixed?.(2) ?? '—'}`}
						</span>
					</article>
				))}
			</section>
			{data?.bestSector && (
				<p className="analysis-card">
					أفضل قطاع متاح: <b>{data.bestSector}</b>
				</p>
			)}
			{data?.available === false && (
				<p className="analysis-error">تتطلب المقارنة بيانات تاريخية متاحة.</p>
			)}
		</main>
	)
}
