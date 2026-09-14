import { useState } from 'react'
import { api } from '../lib/api'

export function ShariahPage() {
	const [symbol, setSymbol] = useState('COMI')
	const [result, setResult] = useState<any>(null)
	const [error, setError] = useState('')
	async function screen() {
		try {
			setError('')
			setResult(await api(`/api/shariah/advanced/${symbol}`))
		} catch (e) {
			setError(e instanceof Error ? e.message : 'تعذر الفحص')
		}
	}
	async function download() {
		const certificate = await api<any>(
			`/api/shariah/advanced/${symbol}/certificate`,
		)
		const blob = new Blob([JSON.stringify(certificate, null, 2)], {
			type: 'application/json',
		})
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `borsaty-${symbol}-shariah-certificate.json`
		link.click()
		URL.revokeObjectURL(link.href)
	}
	return (
		<main className="analysis-page shariah-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Advanced Shariah</p>
				<h1>الفحص الشرعي المتقدم</h1>
				<p>مقارنة تعليمية بين خمس منهجيات، وليست فتوى شرعية.</p>
			</header>
			<section className="analysis-card simulator-form">
				<label>
					رمز السهم
					<input
						value={symbol}
						onChange={(e) => setSymbol(e.target.value.toUpperCase())}
					/>
				</label>
				<button className="primary-button" onClick={screen}>
					افحص السهم
				</button>
				<button className="secondary-button" onClick={download}>
					تنزيل الشهادة
				</button>
			</section>
			{error && <div className="analysis-error">{error}</div>}
			{result && (
				<section className="analysis-card">
					<div className="metric-grid">
						{result.methodologies.map((item: any) => (
							<div key={item.methodology}>
								<span>{item.methodology}</span>
								<strong className={item.available ? 'positive' : 'neutral'}>
									{item.available ? 'متاح' : 'غير متاح'}
								</strong>
								<small>
									{item.available ? 'نتيجة مستلمة' : 'يتطلب مصدر الفحص'}
								</small>
							</div>
						))}
					</div>
					<p className="disclaimer">{result.disclaimer}</p>
				</section>
			)}
		</main>
	)
}
