import { useState } from 'react'
import { api } from '../lib/api'

type Result = {
	symbol: string
	startDate: string
	endDate: string
	startPrice: number
	endPrice: number
	finalValue: number
	returnPercent: number
	profit: number
	equityCurve: { date: string; value: number }[]
	disclaimer: string
}

export function SimulatorPage() {
	const [symbol, setSymbol] = useState('COMI')
	const [amount, setAmount] = useState('10000')
	const [years, setYears] = useState('3')
	const [result, setResult] = useState<Result | null>(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	async function run() {
		setLoading(true)
		setError('')
		try {
			const end = new Date().toISOString().slice(0, 10)
			const start = new Date(Date.now() - Number(years) * 365 * 86400000)
				.toISOString()
				.slice(0, 10)
			setResult(
				await api<Result>('/api/simulator/invest', {
					method: 'POST',
					body: JSON.stringify({
						symbol,
						amount: Number(amount),
						startDate: start,
						endDate: end,
					}),
				}),
			)
		} catch (e) {
			setError(e instanceof Error ? e.message : 'تعذرت المحاكاة')
		} finally {
			setLoading(false)
		}
	}
	return (
		<main className="analysis-page simulator-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Historical Simulator</p>
				<h1>ماذا لو استثمرت؟</h1>
				<p>محاكاة تعليمية تعتمد على الأسعار التاريخية المتاحة.</p>
			</header>
			<section className="analysis-card simulator-form">
				<label>
					الرمز
					<input
						value={symbol}
						onChange={(e) => setSymbol(e.target.value.toUpperCase())}
					/>
				</label>
				<label>
					المبلغ بالجنيه
					<input
						type="number"
						min="1"
						value={amount}
						onChange={(e) => setAmount(e.target.value)}
					/>
				</label>
				<label>
					الفترة
					<select value={years} onChange={(e) => setYears(e.target.value)}>
						<option value="1">سنة</option>
						<option value="2">سنتان</option>
						<option value="3">3 سنوات</option>
					</select>
				</label>
				<button className="primary-button" onClick={run} disabled={loading}>
					{loading ? 'جارٍ الحساب…' : 'شغّل المحاكاة'}
				</button>
			</section>
			{error && <div className="analysis-error">{error}</div>}
			{result && (
				<section className="analysis-card simulator-result">
					<div className="metric-grid">
						<div>
							<span>القيمة النهائية</span>
							<strong>
								{result.finalValue.toLocaleString('ar-EG-u-nu-latn', {
									maximumFractionDigits: 2,
								})}{' '}
								EGP
							</strong>
						</div>
						<div>
							<span>العائد</span>
							<strong
								className={result.returnPercent >= 0 ? 'positive' : 'negative'}
							>
								{result.returnPercent.toFixed(2)}%
							</strong>
						</div>
						<div>
							<span>الربح/الخسارة</span>
							<strong>{result.profit.toFixed(2)} EGP</strong>
						</div>
					</div>
					<div className="equity-curve" aria-label="منحنى قيمة الاستثمار">
						{result.equityCurve.slice(-60).map((point, index, points) => {
							const min = Math.min(...points.map((p) => p.value))
							const max = Math.max(...points.map((p) => p.value))
							return (
								<span
									key={point.date}
									style={{
										left: `${(index / Math.max(points.length - 1, 1)) * 100}%`,
										bottom: `${8 + ((point.value - min) / Math.max(max - min, 1)) * 84}%`,
									}}
								/>
							)
						})}
					</div>
					<small>{result.disclaimer}</small>
				</section>
			)}
		</main>
	)
}
