import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'

type Kind = 'ipo' | 'dividends' | 'earnings' | 'splits'
const config: Record<Kind, { title: string; endpoint: string; label: string }> =
	{
		ipo: {
			title: 'تقويم الطروحات',
			endpoint: '/api/calendar/ipo/upcoming',
			label: 'الطرح',
		},
		dividends: {
			title: 'تقويم التوزيعات',
			endpoint: '/api/calendar/dividends/upcoming',
			label: 'التوزيع',
		},
		earnings: {
			title: 'تقويم النتائج',
			endpoint: '/api/calendar/earnings/upcoming',
			label: 'النتيجة',
		},
		splits: {
			title: 'تقويم الانقسامات',
			endpoint: '/api/calendar/splits',
			label: 'الانقسام',
		},
	}
function dateOf(item: any, kind: Kind) {
	return item[
		kind === 'ipo'
			? 'ipoDate'
			: kind === 'dividends'
				? 'exDate'
				: kind === 'earnings'
					? 'reportDate'
					: 'splitDate'
	]
}
function countdown(date: string) {
	const seconds = Math.max(
		0,
		Math.floor((Date.parse(date) - Date.now()) / 1000),
	)
	const days = Math.floor(seconds / 86400)
	const hours = Math.floor((seconds % 86400) / 3600)
	return `${days}ي ${hours}س`
}
export function SpecializedCalendarsPage({ kind }: { kind: Kind }) {
	const [rows, setRows] = useState<any[]>([])
	const [now, setNow] = useState(Date.now())
	const current = config[kind]
	useEffect(() => {
		void api<{ data: any[] }>(current.endpoint)
			.then((result) => setRows(result.data))
			.catch(() => setRows([]))
		const timer = window.setInterval(() => setNow(Date.now()), 60000)
		return () => window.clearInterval(timer)
	}, [current.endpoint])
	const title = useMemo(() => current.title, [current.title, now])
	async function remind(symbol: string) {
		try {
			await api('/api/calendar/reminders', {
				method: 'POST',
				body: JSON.stringify({ symbol, eventType: kind }),
			})
			window.dispatchEvent(
				new CustomEvent('borsaty-toast', {
					detail: { message: 'تم تسجيل التذكير', type: 'success' },
				}),
			)
		} catch {
			window.dispatchEvent(
				new CustomEvent('borsaty-toast', {
					detail: { message: 'سجّل الدخول لتفعيل التذكير', type: 'error' },
				}),
			)
		}
	}
	return (
		<main className="analysis-page specialized-calendar-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Market Calendar</p>
				<h1>{title}</h1>
				<span>{rows.length} موعداً</span>
			</header>
			<section className="analysis-card specialized-table">
				{rows.map((item) => (
					<article key={item.id}>
						<b>{item.symbol}</b>
						<strong>
							{kind === 'ipo'
								? item.nameAr
								: kind === 'dividends'
									? `${item.amount} ${item.currency}`
									: kind === 'earnings'
										? `EPS: ${item.epsEstimate ?? '—'}`
										: item.ratio}
						</strong>
						<time>
							{new Date(dateOf(item, kind)).toLocaleDateString(
								'ar-EG-u-nu-latn',
							)}
						</time>
						<span className="countdown">{countdown(dateOf(item, kind))}</span>
						{kind === 'dividends' && <small>Yield {item.yieldPercent}%</small>}
						{kind === 'earnings' && (
							<small>
								{item.surprise == null
									? 'لا يوجد Surprise بعد'
									: `Surprise ${item.surprise}%`}
							</small>
						)}
						<button
							className="secondary-button"
							onClick={() => void remind(item.symbol)}
						>
							تذكير
						</button>
					</article>
				))}
			</section>
		</main>
	)
}
