import { useEffect, useMemo, useState } from 'react'
import { navigate } from '../router'

type MarketEnvelope = {
	available?: boolean
	freshness?: 'live' | 'cached' | 'stale'
	data?: unknown
}

type MarketCard = {
	label: string
	caption: string
	value?: number
	change?: number
	status: 'live' | 'cached' | 'unavailable'
}

type NewsItem = {
	id: string
	title: string
	summary?: string
	url: string
	publishedAt?: string
	category?: string
}

const numberFrom = (value: unknown, keys: string[]): number | undefined => {
	if (typeof value === 'number' && Number.isFinite(value)) return value
	if (!value || typeof value !== 'object') return undefined
	const record = value as Record<string, unknown>
	for (const key of keys) {
		const candidate = record[key]
		if (typeof candidate === 'number' && Number.isFinite(candidate))
			return candidate
		if (typeof candidate === 'string') {
			const parsed = Number(candidate.replaceAll(',', ''))
			if (Number.isFinite(parsed)) return parsed
		}
	}
	return undefined
}

const nested = (value: unknown, key: string): unknown => {
	if (!value || typeof value !== 'object') return undefined
	return (value as Record<string, unknown>)[key]
}

const safeJson = async <T,>(path: string): Promise<T | null> => {
	try {
		const response = await fetch(path, {
			headers: { accept: 'application/json' },
		})
		if (!response.ok) return null
		return (await response.json()) as T
	} catch {
		return null
	}
}

const toStatus = (envelope: MarketEnvelope | null): MarketCard['status'] => {
	if (!envelope?.available) return 'unavailable'
	return envelope.freshness === 'live' ? 'live' : 'cached'
}

const formatValue = (value?: number) =>
	value == null
		? '—'
		: new Intl.NumberFormat('ar-EG', {
				maximumFractionDigits: 2,
			}).format(value)

function MarketMetric({ card }: { card: MarketCard }) {
	return (
		<article className="borsaty-market-card">
			<div className="borsaty-market-card__top">
				<div>
					<strong>{card.label}</strong>
					<span>{card.caption}</span>
				</div>
				<i
					className={`borsaty-status-dot is-${card.status}`}
					aria-hidden="true"
				/>
			</div>
			<div className="borsaty-market-card__value">
				{formatValue(card.value)}
			</div>
			<div
				className={`borsaty-market-card__change ${
					card.change == null
						? 'is-muted'
						: card.change > 0
							? 'is-up'
							: card.change < 0
								? 'is-down'
								: ''
				}`}
			>
				{card.change == null
					? 'البيانات غير متاحة حالياً'
					: `${card.change > 0 ? '+' : ''}${card.change.toFixed(2)}%`}
			</div>
		</article>
	)
}

function PublicHeader() {
	return (
		<header className="borsaty-public-header">
			<button className="borsaty-public-brand" onClick={() => navigate('/')}>
				<span>ب</span>
				<strong>بورصتي</strong>
				<small>BORSATY</small>
			</button>
			<nav aria-label="التنقل الرئيسي">
				<button onClick={() => navigate('/markets/egx')}>السوق المصري</button>
				<button onClick={() => navigate('/markets/tasi')}>السوق السعودي</button>
				<button onClick={() => navigate('/analysis/elliott')}>التحليل</button>
				<button onClick={() => navigate('/strategies')}>الاستراتيجيات</button>
			</nav>
			<div className="borsaty-public-actions">
				<button
					className="borsaty-text-button"
					onClick={() => navigate('/login')}
				>
					دخول
				</button>
				<button
					className="borsaty-solid-button"
					onClick={() => navigate('/register')}
				>
					ابدأ مجاناً
				</button>
			</div>
		</header>
	)
}

function PublicFooter() {
	return (
		<footer className="borsaty-public-footer">
			<div>
				<strong>بورصتي</strong>
				<p>منصة عربية تعليمية لمتابعة الأسواق والتحليل المالي.</p>
			</div>
			<nav aria-label="روابط قانونية">
				<a href="/about">عن المنصة</a>
				<a href="/terms">الشروط</a>
				<a href="/privacy">الخصوصية</a>
				<a href="/disclaimer">إخلاء المسؤولية</a>
			</nav>
			<p className="borsaty-public-footer__notice">
				المحتوى تعليمي ولا يمثل توصية استثمارية أو ضماناً للنتائج.
			</p>
		</footer>
	)
}

export function PublicHomePage({ focus }: { focus?: 'EGX' | 'TASI' }) {
	const [egx, setEgx] = useState<MarketEnvelope | null>(null)
	const [tasi, setTasi] = useState<MarketEnvelope | null>(null)
	const [news, setNews] = useState<NewsItem[]>([])

	useEffect(() => {
		let active = true
		void Promise.all([
			safeJson<MarketEnvelope>('/api/market/egx/summary'),
			safeJson<MarketEnvelope>('/api/market/tasi/summary'),
			safeJson<{ data?: NewsItem[] }>('/api/news?limit=6'),
		]).then(([nextEgx, nextTasi, nextNews]) => {
			if (!active) return
			setEgx(nextEgx)
			setTasi(nextTasi)
			setNews(Array.isArray(nextNews?.data) ? nextNews.data.slice(0, 6) : [])
		})
		return () => {
			active = false
		}
	}, [])

	const cards = useMemo<MarketCard[]>(() => {
		const egxData = egx?.data
		const tasiData = tasi?.data
		const tasiValue = numberFrom(tasiData, [
			'value',
			'price',
			'close',
			'indexValue',
			'index_value',
		])
		const tasiChange = numberFrom(tasiData, [
			'changePercent',
			'change_percent',
			'index_change_percent',
			'percentChange',
			'change',
		])
		const gold = nested(egxData, 'gold')
		const silver = nested(egxData, 'silver')
		return [
			{
				label: 'EGX',
				caption: 'السوق المصري',
				value: numberFrom(egxData, ['value', 'close', 'indexValue', 'egx30']),
				change: numberFrom(egxData, [
					'changePercent',
					'change_percent',
					'percentChange',
				]),
				status: toStatus(egx),
			},
			{
				label: 'TASI',
				caption: 'السوق السعودي',
				value: tasiValue,
				change: tasiChange,
				status: toStatus(tasi),
			},
			{
				label: 'GOLD',
				caption: 'الذهب',
				value: numberFrom(gold, ['value', 'price', 'close', 'last']),
				change: numberFrom(gold, ['changePercent', 'change_percent', 'change']),
				status: egx?.available && gold ? toStatus(egx) : 'unavailable',
			},
			{
				label: 'SILVER',
				caption: 'الفضة',
				value: numberFrom(silver, ['value', 'price', 'close', 'last']),
				change: numberFrom(silver, [
					'changePercent',
					'change_percent',
					'change',
				]),
				status: egx?.available && silver ? toStatus(egx) : 'unavailable',
			},
		]
	}, [egx, tasi])

	const heroTitle =
		focus === 'EGX'
			? 'السوق المصري بواجهة أوضح'
			: focus === 'TASI'
				? 'تابع السوق السعودي ببصيرة'
				: 'بورصتك.. ببصيرة الذكاء الاصطناعي'

	return (
		<div className="borsaty-public-page" dir="rtl">
			<PublicHeader />
			<main>
				<section className="borsaty-hero">
					<div className="borsaty-hero__copy">
						<span className="borsaty-kicker">منصة التحليل المالي العربية</span>
						<h1>{heroTitle}</h1>
						<p>
							اجمع متابعة السوق، التحليل الفني التعليمي، الاختبار التاريخي ومنشئ
							الاستراتيجيات في مساحة عربية واحدة مصممة لمصر والسعودية.
						</p>
						<div className="borsaty-hero__actions">
							<button
								className="borsaty-solid-button is-large"
								onClick={() => navigate('/register')}
							>
								ابدأ مجاناً
							</button>
							<button
								className="borsaty-outline-button is-large"
								onClick={() => navigate('/strategies')}
							>
								استكشف الاستراتيجيات
							</button>
						</div>
						<div className="borsaty-hero__chips">
							<span>EGX وTASI</span>
							<span>Elliott وGann</span>
							<span>اختبار تاريخي تعليمي</span>
						</div>
					</div>
					<div className="borsaty-terminal-card" aria-label="ملخص أدوات بورصتي">
						<div className="borsaty-terminal-card__head">
							<span>مركز التحليل</span>
							<i />
						</div>
						<div className="borsaty-terminal-card__grid">
							<strong>السوق</strong>
							<span>متابعة مصر والسعودية</span>
							<strong>التحليل</strong>
							<span>مؤشرات + موجات + زوايا</span>
							<strong>التحقق</strong>
							<span>Backtesting قبل الحكم</span>
						</div>
						<div className="borsaty-terminal-card__disclaimer">
							لا تنفيذ صفقات · لا وعود بعائد
						</div>
					</div>
				</section>

				<section className="borsaty-ticker" aria-label="حالة الأسواق">
					{cards.map((card) => (
						<span key={card.label}>
							<i className={`borsaty-status-dot is-${card.status}`} />
							<b>{card.label}</b>
							{formatValue(card.value)}
						</span>
					))}
				</section>

				<section className="borsaty-section">
					<div className="borsaty-section__heading">
						<div>
							<span className="borsaty-kicker">نظرة موحدة</span>
							<h2>مؤشرات السوق</h2>
						</div>
						<p>تظهر القيم فقط عندما تعيد خدمات السوق بيانات صالحة.</p>
					</div>
					<div className="borsaty-market-grid">
						{cards.map((card) => (
							<MarketMetric card={card} key={card.label} />
						))}
					</div>
				</section>

				<section className="borsaty-section borsaty-tool-section">
					<div className="borsaty-section__heading">
						<div>
							<span className="borsaty-kicker">قرارات قابلة للمراجعة</span>
							<h2>من التحليل إلى الاختبار</h2>
						</div>
					</div>
					<div className="borsaty-tool-grid">
						{[
							{
								number: '01',
								title: 'تحليل السهم',
								text: 'مؤشرات فنية وموجات Elliott وزوايا Gann مع إخلاء تعليمي.',
								path: '/stock/COMI',
							},
							{
								number: '02',
								title: 'منشئ الاستراتيجيات',
								text: 'كوّن رسماً منطقياً صالحاً قبل أي محاكاة تاريخية.',
								path: '/strategies',
							},
							{
								number: '03',
								title: 'الاختبار التاريخي',
								text: 'قارن الفرضية بالأداء التاريخي بدلاً من الاعتماد على الانطباع.',
								path: '/backtest',
							},
						].map((tool) => (
							<button key={tool.title} onClick={() => navigate(tool.path)}>
								<span>{tool.number}</span>
								<h3>{tool.title}</h3>
								<p>{tool.text}</p>
								<b>فتح الأداة ←</b>
							</button>
						))}
					</div>
				</section>

				<section className="borsaty-section">
					<div className="borsaty-section__heading">
						<div>
							<span className="borsaty-kicker">متابعة عربية</span>
							<h2>أخبار السوق</h2>
						</div>
						<button
							className="borsaty-text-button"
							onClick={() => navigate('/news')}
						>
							كل الأخبار
						</button>
					</div>
					{news.length ? (
						<div className="borsaty-news-grid">
							{news.map((item) => (
								<a
									href={item.url}
									key={item.id}
									rel="noreferrer"
									target="_blank"
								>
									<span>{item.category ?? 'السوق'}</span>
									<h3>{item.title}</h3>
									<p>{item.summary ?? 'اقرأ التفاصيل من الخبر الأصلي.'}</p>
								</a>
							))}
						</div>
					) : (
						<div className="borsaty-empty-state">
							<strong>لا توجد أخبار متاحة الآن</strong>
							<p>سيتم عرض الأخبار تلقائياً عند عودة الخدمة.</p>
						</div>
					)}
				</section>

				<section className="borsaty-why">
					<div>
						<span className="borsaty-kicker">لماذا بورصتي؟</span>
						<h2>هندسة مالية عربية، بلا أرقام مختلقة</h2>
					</div>
					<div className="borsaty-why__grid">
						<span>بيانات غير متاحة تظهر «—» بدلاً من قيم تجريبية</span>
						<span>التحليل منفصل عن تنفيذ الأوامر والوساطة</span>
						<span>واجهة RTL متجاوبة للويب والهاتف</span>
						<span>أدوات تعليمية قابلة للتحقق والاختبار</span>
					</div>
				</section>
			</main>
			<PublicFooter />
		</div>
	)
}

export function AnalysisOverviewPage({
	engine,
}: {
	engine: 'elliott' | 'gann'
}) {
	const [symbol, setSymbol] = useState('COMI')
	const isElliott = engine === 'elliott'
	const open = () => {
		const normalized = symbol
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9.-]/g, '')
		if (normalized) navigate(`/stock/${normalized}`)
	}
	return (
		<div className="borsaty-public-page" dir="rtl">
			<PublicHeader />
			<main className="borsaty-analysis-overview">
				<span className="borsaty-kicker">تحليل تعليمي</span>
				<h1>{isElliott ? 'تحليل Elliott Wave' : 'تحليل Gann'}</h1>
				<p>
					{isElliott
						? 'استكشف هيكل الموجات والسيناريو التحليلي مع درجة ثقة، دون تحويله إلى أمر تداول.'
						: 'راجع الزوايا ومستويات الدعم والمقاومة والدورات الزمنية ضمن تحليل تعليمي.'}
				</p>
				<div className="borsaty-symbol-search">
					<label htmlFor="analysis-symbol">رمز السهم</label>
					<input
						id="analysis-symbol"
						value={symbol}
						onChange={(event) => setSymbol(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter') open()
						}}
					/>
					<button className="borsaty-solid-button" onClick={open}>
						فتح التحليل
					</button>
				</div>
				<div className="borsaty-empty-state is-warning">
					<strong>تنبيه مهم</strong>
					<p>
						التحليل الفني احتمالي وتعليمي، ولا يضمن نتيجة مستقبلية ولا يمثل
						توصية بالشراء أو البيع.
					</p>
				</div>
			</main>
			<PublicFooter />
		</div>
	)
}
