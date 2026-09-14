import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function RegionalSettingsPage() {
	const [markets, setMarkets] = useState<
		{
			code: string
			name: string
			country: string
			currency: string
			active?: boolean
		}[]
	>([])
	const [country, setCountry] = useState(
		localStorage.getItem('borsaty-country') ?? 'EG',
	)
	useEffect(() => {
		void api<typeof markets>('/api/regional/markets')
			.then(setMarkets)
			.catch(() => undefined)
	}, [])
	const selected = markets.find((item) => item.country === country)
	return (
		<main className="page-container regional-settings-page">
			<div className="page-heading">
				<div>
					<span className="eyebrow">Regional settings</span>
					<h1>الإعدادات الإقليمية</h1>
				</div>
			</div>
			<section className="settings-card">
				<label>
					الدولة والسوق
					<select
						value={country}
						onChange={(event) => {
							setCountry(event.target.value)
							localStorage.setItem('borsaty-country', event.target.value)
						}}
					>
						{markets.map((market) => (
							<option
								key={market.code}
								value={market.country}
								disabled={market.active === false}
							>
								{market.name} · {market.code}
							</option>
						))}
					</select>
				</label>
				<div className="regional-summary">
					<b>العملة المحلية</b>
					<strong>{selected?.currency ?? 'EGP'}</strong>
					<span>
						اللغة:{' '}
						{country === 'SA' ? 'ar-SA' : country === 'AE' ? 'ar-AE' : 'ar-EG'}
					</span>
				</div>
				<p className="legal-warning">
					الأسواق غير المفعلة تظهر للتخطيط فقط، ولا تعني توفر بيانات تنفيذية أو
					لحظية.
				</p>
			</section>
		</main>
	)
}
