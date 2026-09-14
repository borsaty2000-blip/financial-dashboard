import { useState } from 'react'
import { api } from '../lib/api'
export function CurrencyConverter() {
	const [open, setOpen] = useState(false)
	const [from, setFrom] = useState('USD')
	const [to, setTo] = useState('EGP')
	const [amount, setAmount] = useState('100')
	const [result, setResult] = useState<any>(null)
	const [favorites, setFavorites] = useState<string[]>(() =>
		JSON.parse(localStorage.getItem('borsaty_currency_favorites') ?? '[]'),
	)
	async function convert() {
		try {
			setResult(
				await api('/api/tools/convert', {
					method: 'POST',
					body: JSON.stringify({ from, to, amount: Number(amount) }),
				}),
			)
		} catch {
			setResult({ error: 'لا تتوفر أسعار العملات حالياً' })
		}
	}
	function saveFavorite() {
		const pair = `${from}/${to}`
		const next = [...new Set([...favorites, pair])].slice(-8)
		setFavorites(next)
		localStorage.setItem('borsaty_currency_favorites', JSON.stringify(next))
	}
	return (
		<>
			<button
				className="currency-trigger"
				onClick={() => setOpen(true)}
				title="محول العملات"
			>
				💱
			</button>
			{open && (
				<div className="currency-overlay" onMouseDown={() => setOpen(false)}>
					<section
						className="currency-modal"
						onMouseDown={(event) => event.stopPropagation()}
						dir="rtl"
					>
						<button className="link-button" onClick={() => setOpen(false)}>
							إغلاق
						</button>
						<h2>محول العملات</h2>
						<div className="currency-fields">
							<input
								type="number"
								value={amount}
								onChange={(e) => setAmount(e.target.value)}
							/>
							<select value={from} onChange={(e) => setFrom(e.target.value)}>
								<option>USD</option>
								<option>EGP</option>
								<option>EUR</option>
								<option>SAR</option>
								<option>GBP</option>
							</select>
							<span>←</span>
							<select value={to} onChange={(e) => setTo(e.target.value)}>
								<option>EGP</option>
								<option>USD</option>
								<option>EUR</option>
								<option>SAR</option>
								<option>GBP</option>
							</select>
						</div>
						<button className="primary-button" onClick={() => void convert()}>
							تحويل
						</button>
						<button className="secondary-button" onClick={saveFavorite}>
							حفظ الزوج المفضل
						</button>
						{favorites.length > 0 && (
							<div className="currency-favorites">
								{favorites.map((pair) => (
									<button
										key={pair}
										className="link-button"
										onClick={() => {
											const [nextFrom, nextTo] = pair.split('/')
											setFrom(nextFrom)
											setTo(nextTo)
										}}
									>
										{pair}
									</button>
								))}
							</div>
						)}
						{result && (
							<div className="conversion-result">
								{result.error ??
									`${result.result?.toLocaleString?.() ?? '—'} ${result.to}`}
							</div>
						)}
					</section>
				</div>
			)}
		</>
	)
}
