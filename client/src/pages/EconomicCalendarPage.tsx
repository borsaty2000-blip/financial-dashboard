import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function EconomicCalendarPage() {
	const [filters, setFilters] = useState({
		country: 'ALL',
		importance: 'ALL',
		category: 'ALL',
	})
	const [events, setEvents] = useState<any[]>([])
	const [message, setMessage] = useState('')
	async function load() {
		const query = new URLSearchParams(filters)
		const result = await api<{ data: any[] }>(`/api/calendar/events?${query}`)
		setEvents(result.data)
	}
	useEffect(() => {
		void load().catch(() => setEvents([]))
	}, [filters])
	async function notify() {
		try {
			const result = await api<{ created: number }>('/api/calendar/notify', {
				method: 'POST',
			})
			setMessage(`تم تجهيز ${result.created} تنبيهات`)
		} catch {
			setMessage('سجّل الدخول لتفعيل التنبيهات')
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Economic Calendar</p>
				<h1>التقويم الاقتصادي</h1>
				<button className="primary-button" onClick={notify}>
					تنبيهات الأحداث المهمة
				</button>
			</header>
			<section className="analysis-card calendar-filters">
				<select
					value={filters.country}
					onChange={(e) => setFilters({ ...filters, country: e.target.value })}
				>
					<option value="ALL">كل الدول</option>
					<option value="EG">مصر</option>
					<option value="SA">السعودية</option>
					<option value="US">أمريكا</option>
					<option value="GLOBAL">عالمي</option>
				</select>
				<select
					value={filters.importance}
					onChange={(e) =>
						setFilters({ ...filters, importance: e.target.value })
					}
				>
					<option value="ALL">كل الأهمية</option>
					<option value="HIGH">عالي</option>
					<option value="MEDIUM">متوسط</option>
				</select>
				<select
					value={filters.category}
					onChange={(e) => setFilters({ ...filters, category: e.target.value })}
				>
					<option value="ALL">كل الفئات</option>
					<option value="Monetary">فائدة</option>
					<option value="Inflation">تضخم</option>
					<option value="Employment">توظيف</option>
					<option value="Growth">نمو</option>
				</select>
			</section>
			{message && <p>{message}</p>}
			<section className="analysis-card calendar-list">
				{events.map((event) => (
					<article key={event.eventKey}>
						<time>{new Date(event.date).toLocaleDateString('ar-EG')}</time>
						<b>{event.title}</b>
						<span className={`importance ${event.importance.toLowerCase()}`}>
							{event.importance === 'HIGH' ? 'عالٍ' : 'متوسط'}
						</span>
						<small>
							{event.country} · {event.category}
						</small>
					</article>
				))}
			</section>
		</main>
	)
}
