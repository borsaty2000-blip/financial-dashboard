import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Candle = { close?: number }
type Response = { candles?: Candle[]; count?: number; source?: string; market?: string }

export function StockTestPage({ symbol }: { symbol: string }) {
	const normalized = String(symbol || '').trim().toUpperCase() || 'UNKNOWN'
	const [result, setResult] = useState<Response | null>(null)
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		let active = true
		setLoading(true)
		void api<Response>(`/api/market/candles/${encodeURIComponent(normalized)}?market=EGX&days=500`, {
			suppressToast: true,
		})
			.then((value) => active && setResult(value))
			.catch(() => active && setError('تعذر تحميل بيانات الاختبار'))
			.finally(() => active && setLoading(false))
		return () => {
			active = false
		}
	}, [normalized])

	const candles = Array.isArray(result?.candles) ? result.candles : []
	return (
		<main className="analysis-card" dir="rtl" style={{ margin: 40, padding: 32 }}>
			<h1>اختبار السهم: {normalized}</h1>
			{loading ? <p>جارٍ تحميل بيانات المصدر...</p> : null}
			<p>السوق: {result?.market ?? 'EGX'}</p>
			<p>عدد الشموع: {result?.count ?? candles.length}</p>
			<p>آخر إغلاق: {candles.at(-1)?.close ?? 'غير متاح'}</p>
			<p>المصدر: {result?.source ?? 'غير متاح'}</p>
			{error ? <p role="alert">{error}</p> : null}
		</main>
	)
}
