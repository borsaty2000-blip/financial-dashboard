import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function AnalystsPage() {
	const [analysts, setAnalysts] = useState<any[]>([])
	useEffect(() => {
		void api<any[]>('/api/analysts')
			.then(setAnalysts)
			.catch(() => setAnalysts([]))
	}, [])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Analyst Program</p>
				<h1>المحللون</h1>
				<p>تابع المحللين المعتمدين عندما تتوفر طلبات مقبولة.</p>
			</header>
			<section className="analysis-card analyst-grid">
				{analysts.length ? (
					analysts.map((item) => (
						<article key={item.id}>
							<h2>
								{item.displayName ?? item.user?.fullName ?? item.user?.username}
							</h2>
							<p>{item.bio ?? 'لا توجد نبذة'}</p>
							<small>
								{item.specialties?.join('، ') || 'تخصصات غير محددة'}
							</small>
						</article>
					))
				) : (
					<p>لا يوجد محللون معتمدون حالياً.</p>
				)}
			</section>
		</main>
	)
}
