import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Candle = { close?: number }
type Response = { candles?: Candle[] }

export function StockTestPage({ symbol }: { symbol: string }) {
	const normalized = String(symbol || '').trim().toUpperCase() || 'UNKNOWN'
	const [result, setResult] = useState<Response | null>(null)
	const [error, setError] = useState('')

	useEffect(() => {
		let active = true
		void api<Response>(`/api/market/candles/${encodeURIComponent(normalized)}?days=500`, {
			suppressToast: true,
		})
			.then((value) => active && setResult(value))
			.catch(() => active && setError('تعذر تحميل بيانات الاختبار'))
		return () => {
			active = false
		}
	}, [normalized])

	const candles = Array.isArray(result?.candles) ? result.candles : []
	return (
		<main className="analysis-card" dir="rtl" style={{ margin: 40, padding: 32 }}>
			<h1>اختبار السهم: {normalized}</h1>
			<p>عدد الشموع: {candles.length}</p>
			<p>آخر إغلاق: {candles.at(-1)?.close ?? 'غير متاح'}</p>
			{error ? <p role="alert">{error}</p> : null}
		</main>
	)
}
