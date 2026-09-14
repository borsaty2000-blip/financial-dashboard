import { useEffect, useState } from 'react'
import { api } from '../lib/api'

const fields = [
	['peMax', 'P/E أقصى'],
	['rsiMax', 'RSI أقصى'],
	['rsiMin', 'RSI أدنى'],
	['volumeMin', 'الحجم الأدنى'],
	['marketCapMin', 'القيمة السوقية الأدنى'],
	['dividendYieldMin', 'عائد التوزيع الأدنى'],
	['consensusMin', 'Consensus الأدنى'],
] as const
export function AdvancedScreenerPage() {
	const [filters, setFilters] = useState<Record<string, any>>({})
	const [rows, setRows] = useState<any[]>([])
	const [name, setName] = useState('فلتر جديد')
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(false)
	async function scan(next = filters) {
		setLoading(true)
		try {
			const result = await api<{ data: any[] }>('/api/screener/scan', {
				method: 'POST',
				body: JSON.stringify(next),
			})
			setRows(result.data as any[])
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		void scan()
	}, [])
	async function save() {
		await api('/api/screener/save', {
			method: 'POST',
			body: JSON.stringify({ name, filters }),
		})
		setMessage('تم حفظ الفلتر')
	}
	return (
		<main className="analysis-page screener-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Advanced Screener</p>
				<h1>الماسح المتقدم</h1>
			</header>
			<div className="screener-layout">
				<aside className="analysis-card screener-sidebar">
					{fields.map(([key, label]) => (
						<label key={key}>
							{label}
							<input
								type="number"
								value={filters[key] ?? ''}
								onChange={(e) =>
									setFilters({
										...filters,
										[key]: e.target.value ? Number(e.target.value) : undefined,
									})
								}
							/>
						</label>
					))}
					<button
						className="primary-button"
						onClick={() => void scan()}
						disabled={loading}
					>
						فحص الأسهم
					</button>
					<input value={name} onChange={(e) => setName(e.target.value)} />
					<button className="secondary-button" onClick={() => void save()}>
						حفظ الفلتر
					</button>
					{message && <small>{message}</small>}
				</aside>
				<section className="analysis-card screener-results">
					<div className="panel-title">
						<h2>النتائج</h2>
						<span>{rows.length} سهم</span>
					</div>
					{rows.map((row) => (
						<div className="screener-row" key={row.symbol}>
							<b>{row.symbol}</b>
							<span>{row.price?.toFixed?.(2) ?? '—'}</span>
							<span>RSI {row.rsi?.toFixed?.(1) ?? '—'}</span>
							<span>
								{row.changePercent == null
									? '—'
									: `${row.changePercent.toFixed(2)}%`}
							</span>
							<button
								className="link-button"
								onClick={() => {
									window.history.pushState({}, '', `/stock/${row.symbol}`)
									window.dispatchEvent(new PopStateEvent('popstate'))
								}}
							>
								فتح
							</button>
						</div>
					))}
				</section>
			</div>
		</main>
	)
}
