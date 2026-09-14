import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function NewsPage() {
	const [filters, setFilters] = useState({ category: '', symbol: '' })
	const [items, setItems] = useState<any[]>([])
	useEffect(() => {
		const q = new URLSearchParams(filters)
		void api<{ data: any[] }>(`/api/news?${q}`)
			.then((result) => setItems(result.data))
			.catch(() => setItems([]))
	}, [filters])
	return (
		<main className="analysis-page news-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">News Intelligence</p>
				<h1>أخبار السوق</h1>
			</header>
			<section className="analysis-card news-filters">
				<select
					value={filters.category}
					onChange={(e) => setFilters({ ...filters, category: e.target.value })}
				>
					<option value="">كل التصنيفات</option>
					<option value="اقتصاد">اقتصاد</option>
					<option value="شركات">شركات</option>
					<option value="عام">عام</option>
				</select>
				<input
					placeholder="فلترة بالرمز COMI"
					value={filters.symbol}
					onChange={(e) =>
						setFilters({ ...filters, symbol: e.target.value.toUpperCase() })
					}
				/>
			</section>
			<section className="news-grid">
				{items.map((item) => (
					<article className="news-card analysis-card" key={item.id}>
						<div className="news-card-top">
							<span>{item.source}</span>
							<span className={`sentiment ${item.sentiment.label}`}>
								{item.sentiment.label === 'positive'
									? 'إيجابي'
									: item.sentiment.label === 'negative'
										? 'سلبي'
										: 'محايد'}
							</span>
						</div>
						<h2>{item.title}</h2>
						<p>{item.summary}</p>
						<small>
							{item.category} ·{' '}
							{new Date(item.publishedAt).toLocaleString('ar-EG')}
						</small>
						<a href={item.url} target="_blank" rel="noreferrer">
							الخبر الكامل
						</a>
					</article>
				))}
			</section>
			{!items.length && (
				<div className="analysis-card">
					لا تتوفر أخبار من المصادر الحالية حالياً.
				</div>
			)}
		</main>
	)
}
