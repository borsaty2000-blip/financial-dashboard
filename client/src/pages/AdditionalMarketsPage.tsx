import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Kind = 'forex' | 'commodities' | 'crypto' | 'etf' | 'bonds'
const titles: Record<Kind, string> = {
	forex: 'أسواق العملات',
	commodities: 'أسواق السلع',
	crypto: 'العملات الرقمية',
	etf: 'صناديق ETF',
	bonds: 'السندات',
}
export function AdditionalMarketsPage({ kind }: { kind: Kind }) {
	const [rows, setRows] = useState<any[]>([])
	const [message, setMessage] = useState('')
	useEffect(() => {
		void api<any>(`/api/market/${kind}`)
			.then((result) => setRows(result.data ?? []))
			.catch(() => {
				setRows([])
				setMessage('لا تتوفر بيانات هذا السوق حالياً')
			})
	}, [kind])
	return (
		<main className="analysis-page additional-markets-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Markets</p>
				<h1>{titles[kind]}</h1>
				<span>{rows.length} عنصر</span>
			</header>
			{kind === 'forex' && (
				<div className="major-pairs">
					الأزواج الرئيسية: EUR/USD · GBP/USD · USD/JPY · USD/CHF · AUD/USD ·
					USD/CAD · NZD/USD
				</div>
			)}
			<section className="analysis-card market-catalog-grid">
				{rows.map((row) => (
					<article key={row.symbol ?? row.pair}>
						<b>{row.symbol ?? row.pair}</b>
						<strong>{row.name ?? row.base ?? row.title ?? '—'}</strong>
						<span>{row.category ?? row.market ?? row.currency ?? '—'}</span>
						<small>
							{row.price == null
								? row.rate == null
									? row.yield == null
										? '—'
										: `Yield ${row.yield}`
									: row.rate
								: row.price}
						</small>
						<em>
							{row.available === false ? 'غير متاح' : (row.source ?? 'متاح')}
						</em>
					</article>
				))}
			</section>
			{message && <p className="analysis-error">{message}</p>}
		</main>
	)
}
