import { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useLivePrice } from '../hooks/useLivePrice'
import ProfessionalStockChart from '../components/ProfessionalStockChart'
import { BrilliantSummary } from '../components/Analysis/BrilliantSummary'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'

type Candle = {
	date: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}

type Candles = {
	symbol: string
	candles: Candle[]
	count: number
	freshness?: 'live' | 'delayed' | 'cached'
}

type Watchlist = { id: string; items: { symbol: string }[] }

type CompanyResponse = { nameAr?: string }

export function StockDetailPage({
	symbol,
	companyName,
	market: marketOverride,
}: {
	symbol: string
	companyName?: string
	market?: 'EGX' | 'TASI'
}) {
	const normalized = symbol.toUpperCase()
	const market =
		marketOverride ?? (/^\d{4,5}$/u.test(normalized) ? 'TASI' : 'EGX')
	const [data, setData] = useState<Candles | null>(null)
	const [resolvedCompanyName, setResolvedCompanyName] = useState<string>()
	const [message, setMessage] = useState('')
	const [loading, setLoading] = useState(true)
	const [isPlaying, setIsPlaying] = useState(false)
	const livePrice = useLivePrice(normalized, market)

	useEffect(() => {
		const controller = new AbortController()
		const timeout = window.setTimeout(() => controller.abort(), 12_000)
		let cancelled = false
		void api<Candles>(
			`/api/market/candles/${normalized}?market=${market}&days=250`,
			{ signal: controller.signal },
		)
			.then((result) => {
				if (!cancelled) setData(result)
			})
			.catch(() => {
				if (!cancelled) setMessage('لا تتوفر بيانات تاريخية حالياً')
			})
			.finally(() => {
				window.clearTimeout(timeout)
				if (!cancelled) setLoading(false)
			})
		void api<CompanyResponse>(`/api/market/company/${normalized}`, {
			suppressToast: true,
		})
			.then((result) => {
				if (
					!cancelled &&
					result.nameAr &&
					result.nameAr.toUpperCase() !== normalized
				)
					setResolvedCompanyName(result.nameAr)
			})
			.catch(() => undefined)
		return () => {
			cancelled = true
			controller.abort()
			window.clearTimeout(timeout)
		}
	}, [market, normalized])

	const stats = useMemo(() => {
		const candles = data?.candles ?? []
		const last = candles.at(-1)
		const previous = candles.at(-2)
		return {
			last,
			changePercent:
				last && previous && previous.close !== 0
					? ((last.close - previous.close) / previous.close) * 100
					: null,
		}
	}, [data])

	const displayCompanyName =
		resolvedCompanyName ??
		(companyName && companyName.toUpperCase() !== normalized
			? companyName
			: undefined)

	const addToWatchlist = async () => {
		try {
			const lists = await api<Watchlist[]>('/api/watchlists')
			const list =
				lists[0] ??
				(await api<Watchlist>('/api/watchlists', {
					method: 'POST',
					body: JSON.stringify({ name: 'قائمتي' }),
				}))
			await api(`/api/watchlists/${list.id}/items`, {
				method: 'POST',
				body: JSON.stringify({ symbol: normalized }),
			})
			setMessage('تمت إضافة السهم إلى قائمتك')
		} catch {
			setMessage('سجّل الدخول لإضافة السهم إلى قائمتك')
		}
	}

	const listen = async () => {
		const text = `السعر الحالي لسهم ${normalized} هو ${formatEnglishNumber(stats.last?.close)}. التغير ${formatEnglishPercent(stats.changePercent)}.`
		try {
			const response = await fetch(
				`${import.meta.env.VITE_API_URL ?? ''}/api/analysis/${normalized}/audio`,
			)
			if (
				response.ok &&
				response.headers.get('content-type')?.includes('audio')
			) {
				const audio = new Audio(URL.createObjectURL(await response.blob()))
				setIsPlaying(true)
				audio.onended = () => setIsPlaying(false)
				await audio.play()
				return
			}
		} catch {
			/* Browser speech is the intentional fallback. */
		}
		if ('speechSynthesis' in window) {
			window.speechSynthesis.cancel()
			window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
		}
	}

	const shareStock = async () => {
		const url = `${window.location.origin}/stock/${normalized}`
		try {
			await navigator.clipboard.writeText(url)
			setMessage('تم نسخ رابط السهم')
		} catch {
			setMessage(url)
		}
	}

	return (
		<main className="stock-detail-page" dir="rtl">
			<header className="stock-detail-header stock-detail-header--unified">
				<a className="stock-brand" href="/" aria-label="العودة إلى borsatyai">
					<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				</a>
				<button className="link-button" onClick={() => window.history.back()}>
					← العودة
				</button>
				<div className="stock-identity">
					<p className="eyebrow">تحليل سهم موحد</p>
					<span
						className={`market-badge ${market === 'TASI' ? 'market-tasi' : 'market-egx'}`}
					>
						{market === 'TASI' ? 'السعودية · SAR' : 'مصر · EGP'}
					</span>
					<h1>
						{displayCompanyName ?? normalized}
						<small className="stock-symbol-label">{normalized}</small>
					</h1>
				</div>
				<div className="stock-header-quote" aria-label="السعر والتغير">
					<span>السعر الحالي</span>
					<strong>
						{formatEnglishNumber(livePrice?.price ?? stats.last?.close)}
					</strong>
					<b
						className={
							stats.changePercent != null && stats.changePercent >= 0
								? 'positive'
								: 'negative'
						}
					>
						{formatEnglishPercent(stats.changePercent)}
					</b>
				</div>
				<div className="stock-header-actions">
					<button className="secondary-button" onClick={listen}>
						{isPlaying ? 'إيقاف الصوت' : 'استمع للتحليل'}
					</button>
					<button className="primary-button" onClick={addToWatchlist}>
						＋ أضف إلى قائمتي
					</button>
					<button className="secondary-button" onClick={shareStock}>
						مشاركة
					</button>
					<a
						className="secondary-button"
						href={`/api/reports/stock/${normalized}/pdf`}
						download
					>
						PDF
					</a>
				</div>
			</header>
			{loading && (
				<div className="stock-detail-skeleton">
					<i />
					<i />
					<i />
				</div>
			)}
			{message && <div className="analysis-error">{message}</div>}
			{!loading && !data && (
				<section className="analysis-empty-panel stock-empty-panel">
					<strong>بيانات السهم غير متاحة حالياً</strong>
					<p>
						لم تُرجع مصادر الشموع بيانات موثوقة لهذا الرمز. لن نعرض أرقاماً
						تجريبية.
					</p>
				</section>
			)}
			{data && !loading && (
				<div className="stock-analysis-single-page">
					<BrilliantSummary symbol={normalized} market={market} />
					<section
						className="analysis-card stock-chart-card"
						aria-label="الرسم والمؤشرات الفنية"
					>
						<div className="panel-title">
							<div>
								<span className="eyebrow">السعر والحجم · {normalized}</span>
								<h2>الرسم السعري الاحترافي</h2>
							</div>
							<span className="muted">شموع · حجم · RSI · MACD</span>
						</div>
						<ProfessionalStockChart candles={data.candles} />
					</section>
				</div>
			)}
		</main>
	)
}
