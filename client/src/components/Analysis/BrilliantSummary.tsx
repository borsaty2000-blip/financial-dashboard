import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { formatEnglishNumber, formatEnglishPercent } from '../../lib/format'

type Point = {
	title: string
	detail: string
	sentiment: 'positive' | 'negative' | 'neutral'
	weight: number
}
type Summary = {
	symbol: string
	timestamp: string
	verdict: { action: string; label: string; confidence: number; reason: string }
	keyPoints: Point[]
	scenario: {
		label: string
		confidence: number
		support: number | null
		resistance: number | null
	}
	risks: string[]
	watch: string[]
	counts: { positive: number; negative: number; conflicting: boolean }
	disclaimer: string
}

const icons = { positive: '●', negative: '●', neutral: '●' }

export function BrilliantSummary({
	symbol,
	market,
}: {
	symbol: string
	market: 'EGX' | 'TASI'
}) {
	const [summary, setSummary] = useState<Summary | null>(null)
	const [loading, setLoading] = useState(true)
	useEffect(() => {
		let active = true
		setLoading(true)
		void api<{ data: Summary }>(
			`/api/analysis/${symbol}/brilliant-summary?market=${market}`,
			{ suppressToast: true },
		)
			.then((result) => {
				const value = result?.data
				if (
					active &&
					value &&
					value.verdict &&
					Array.isArray(value.keyPoints) &&
					value.scenario &&
					Array.isArray(value.risks) &&
					Array.isArray(value.watch) &&
					value.counts
				)
					setSummary(value)
				else if (active) setSummary(null)
			})
			.catch(() => {
				if (active) setSummary(null)
			})
			.finally(() => {
				if (active) setLoading(false)
			})
		return () => {
			active = false
		}
	}, [symbol, market])
	if (loading)
		return (
			<section className="brilliant-summary brilliant-summary--loading">
				<div />
				<div />
				<div />
			</section>
		)
		if (
			!summary ||
			!summary.verdict ||
			!summary.scenario ||
			!summary.counts
		)
		return (
			<section className="brilliant-summary brilliant-summary--empty">
					<strong>لا تتوفر قراءة مكتملة حالياً</strong>
				<p>
					لن نعرض حكماً ناقصاً أو أرقاماً مختلقة. أعد المحاولة عند توفر الشموع
					الكافية.
				</p>
			</section>
		)
	return (
		<section
			className={`brilliant-summary verdict-${summary.verdict.action.toLowerCase()}`}
			aria-label="الملخص التحليلي العبقري"
		>
			<header className="brilliant-summary__header">
				<div>
					<span className="eyebrow">ملخص بورصتي · {summary.symbol}</span>
					<h2>الملخص التحليلي الموحد</h2>
					<p>{summary.verdict.reason}</p>
				</div>
				<div className="brilliant-summary__verdict">
					<b>{summary.verdict.label}</b>
					<span>
						الثقة: {formatEnglishPercent(summary.verdict.confidence / 100)}
					</span>
					<i style={{ width: `${summary.verdict.confidence}%` }} />
				</div>
			</header>
			<div className="brilliant-summary__section">
				<h3>النقاط الرئيسية</h3>
				<div className="brilliant-summary__points">
					{summary.keyPoints.map((point, index) => (
						<article
							className={`brilliant-point ${point.sentiment}`}
							key={`${point.title}-${index}`}
						>
							<b>{index + 1}</b>
							<span>{icons[point.sentiment]}</span>
							<div>
								<strong>{point.title}</strong>
								<small>{point.detail}</small>
							</div>
						</article>
					))}
				</div>
			</div>
			<div className="brilliant-summary__scenario">
				<div>
					<span>السيناريو الأقرب</span>
					<strong>{summary.scenario.label}</strong>
				</div>
				<b>{summary.scenario.confidence}%</b>
				<small>
					{summary.scenario.support
						? `الدعم ${formatEnglishNumber(summary.scenario.support)}`
						: 'الدعم غير متاح'}{' '}
					·{' '}
					{summary.scenario.resistance
						? `المقاومة ${formatEnglishNumber(summary.scenario.resistance)}`
						: 'المقاومة غير متاحة'}
				</small>
			</div>
			<div className="brilliant-summary__columns">
				<div>
					<h3>المخاطر</h3>
					{summary.risks.length ? (
						<ul>
							{summary.risks.map((risk) => (
								<li key={risk}>{risk}</li>
							))}
						</ul>
					) : (
						<p>لا توجد مدخلات مخاطر كافية.</p>
					)}
				</div>
				<div>
					<h3>راقب</h3>
					{summary.watch.length ? (
						<ul>
							{summary.watch.map((item) => (
								<li key={item}>{item}</li>
							))}
						</ul>
					) : (
						<p>لا توجد مستويات مراقبة مكتملة.</p>
					)}
				</div>
			</div>
			<footer>
				{summary.counts.conflicting
					? 'الإشارات متعارضة؛ تم تحييد الخلاصة بدلاً من اختزال التعارض.'
					: 'الخلاصة مبنية على الإشارات المتاحة فقط.'}{' '}
				{summary.disclaimer}
			</footer>
		</section>
	)
}
