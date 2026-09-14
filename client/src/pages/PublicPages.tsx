import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { navigate } from '../router'
import { formatEnglishNumber, formatEnglishPercent } from '../lib/format'
import { PublicMarketPulse } from '../components/PublicMarketPulse'

type MarketEnvelope<T = unknown> = {
	available?: boolean
	freshness?: 'live' | 'delayed' | 'cached' | 'stale'
	data?: T
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

type LiveIndex = {
	value: number | null
	changePercent: number | null
	freshness: 'live' | 'delayed' | 'cached' | 'unavailable'
	available: boolean
}

type DirectoryCompany = {
	symbol: string
	displaySymbol?: string
	name: string
	currency?: string
	exchange?: string
	price?: number | null
	changePercent?: number | null
	available?: boolean
	freshness?: 'live' | 'delayed' | 'cached' | 'unavailable'
}

type MarketMover = {
	symbol: string
	price?: number | null
	changePercent?: number | null
	freshness?: 'live' | 'delayed' | 'cached' | 'unavailable'
}

type UnifiedLive = {
	indices?: Record<string, LiveIndex>
	companies?: DirectoryCompany[]
	directories?: {
		egx?: DirectoryCompany[]
		tasi?: DirectoryCompany[]
	}
	topMovers?: MarketMover[]
	news?: NewsItem[]
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
			cache: 'no-store',
			headers: {
				accept: 'application/json',
				'cache-control': 'no-cache',
			},
		})
		if (!response.ok && response.status !== 304) return null
		return (await response.json()) as T
	} catch {
		return null
	}
}

const toStatus = (envelope: MarketEnvelope | null): MarketCard['status'] => {
	if (!envelope?.available) return 'unavailable'
	return envelope.freshness === 'live' ? 'live' : 'cached'
}
const quoteValue = (value: unknown) =>
	numberFrom(value, ['value', 'price', 'close', 'indexValue', 'index_value'])

const formatValue = (value?: number) => formatEnglishNumber(value)

const arabicCompanyNames: Record<string, string> = {
	COMI: 'البنك التجاري الدولي',
	ABUK: 'أبو قير للأسمدة والصناعات الكيماوية',
	ETEL: 'المصرية للاتصالات',
	SWDY: 'السويدي إليكتريك',
	TMGH: 'مجموعة طلعت مصطفى القابضة',
	ORAS: 'أوراسكوم كونستراكشون',
	MFPC: 'مصر لإنتاج الأسمدة - موبكو',
	EKHO: 'القابضة المصرية الكويتية',
	HRHO: 'المجموعة المالية هيرميس القابضة',
	CIEC: 'القاهرة للاستثمار والتنمية العقارية',
	EFIH: 'إي فاينانس للاستثمارات المالية والرقمية',
	SCRC: 'مدينة مصر للإسكان والتعمير',
	'2222': 'أرامكو السعودية',
	'1120': 'مصرف الراجحي',
	'1211': 'شركة التعدين العربية السعودية - معادن',
}

const arabicCompanyName = (company: DirectoryCompany, displaySymbol: string) =>
	arabicCompanyNames[displaySymbol.toUpperCase()] ??
	arabicCompanyNames[company.symbol.toUpperCase()] ??
	company.name

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
				{card.change == null ? '—' : formatEnglishPercent(card.change)}
			</div>
		</article>
	)
}

function MarketDirectory({
	title,
	market,
	companies,
	prices,
}: {
	title: string
	market: 'EGX' | 'TASI'
	companies: DirectoryCompany[]
	prices: Map<string, MarketMover>
}) {
	const [query, setQuery] = useState('')
	const [sortKey, setSortKey] = useState<
		'symbol' | 'name' | 'price' | 'change'
	>('symbol')
	const [page, setPage] = useState(1)
	const pageSize = 25
	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		const matching = !normalized
			? companies
			: companies.filter((company) =>
					`${company.displaySymbol ?? ''} ${company.symbol} ${company.name}`
						.toLowerCase()
						.includes(normalized),
				)
		return [...matching].sort((left, right) => {
			if (sortKey === 'name') return left.name.localeCompare(right.name)
			if (sortKey === 'price')
				return (right.price ?? -Infinity) - (left.price ?? -Infinity)
			if (sortKey === 'change')
				return (
					(right.changePercent ?? -Infinity) - (left.changePercent ?? -Infinity)
				)
			return (left.displaySymbol ?? left.symbol).localeCompare(
				right.displaySymbol ?? right.symbol,
			)
		})
	}, [companies, query, sortKey])
	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
	const safePage = Math.min(page, pageCount)
	const visibleCompanies = filtered.slice(
		(safePage - 1) * pageSize,
		safePage * pageSize,
	)
	const availableCount = companies.filter(
		(company) => company.available || company.price != null,
	).length

	return (
		<section className="borsaty-section borsaty-directory-section">
			<div className="borsaty-section__heading">
				<div>
					<span className="borsaty-kicker">دليل السوق الكامل</span>
					<h2>{title}</h2>
				</div>
				<div className="borsaty-directory-heading-stats">
					<strong>
						{filtered.length} من {companies.length} سهم
					</strong>
					<span>{availableCount} بسعر متاح</span>
				</div>
			</div>
			<div className="borsaty-directory-chips" aria-label="فلاتر دليل الأسهم">
				<span className="is-active">جميع الأسهم</span>
				<span>الأكثر ارتفاعاً</span>
				<span>الأكثر نشاطاً</span>
				<span>الأعلى سعراً</span>
				<span>الأسهم المتاحة للتحليل</span>
			</div>
			<div className="borsaty-directory-toolbar">
				<div>
					<label htmlFor={`${market.toLowerCase()}-directory-search`}>
						بحث بالرمز أو اسم الشركة
					</label>
					<input
						id={`${market.toLowerCase()}-directory-search`}
						value={query}
						onChange={(event) => {
							setQuery(event.target.value)
							setPage(1)
						}}
						placeholder={
							market === 'EGX' ? 'مثال: COMI أو البنك' : 'مثال: 2222 أو أرامكو'
						}
					/>
				</div>
				<label className="borsaty-directory-sort">
					<span>ترتيب</span>
					<select
						value={sortKey}
						onChange={(event) => {
							setSortKey(event.target.value as typeof sortKey)
							setPage(1)
						}}
					>
						<option value="symbol">الرمز</option>
						<option value="name">اسم الشركة</option>
						<option value="price">السعر المتاح</option>
						<option value="change">التغير</option>
					</select>
				</label>
			</div>
			{companies.length ? (
				<div className="borsaty-directory-table-wrap">
					<table className="borsaty-directory-table">
						<thead>
							<tr>
								<th>السهم</th>
								<th>السعر</th>
								<th>التغير</th>
								<th>الحالة</th>
								<th>التحليل</th>
							</tr>
						</thead>
						<tbody>
							{visibleCompanies.map((company) => {
								const mover = prices.get(company.symbol)
								const displaySymbol = company.displaySymbol ?? company.symbol
								const price = mover?.price ?? company.price ?? undefined
								const change =
									mover?.changePercent ?? company.changePercent ?? undefined
								const status =
									(company.freshness ?? mover?.freshness) === 'live'
										? 'live'
										: price != null
											? 'cached'
											: 'unavailable'
								const arabicName = arabicCompanyName(company, displaySymbol)
								return (
									<tr key={`${market}-${company.symbol}`}>
										<td>
											<button
												className="borsaty-directory-symbol"
												onClick={() => navigate(`/stock/${company.symbol}`)}
											>
												<i
													className={`borsaty-status-dot is-${status}`}
													aria-hidden="true"
												/>
												<div>
													<b>{arabicName}</b>
													<small>{displaySymbol}</small>
												</div>
											</button>
										</td>
										<td>{formatValue(price)}</td>
										<td
											className={
												change == null
													? 'is-muted'
													: change > 0
														? 'is-up'
														: change < 0
															? 'is-down'
															: ''
											}
										>
											{change == null ? '—' : formatEnglishPercent(change)}
										</td>
										<td>
											<span className={`borsaty-availability is-${status}`}>
												<i className="borsaty-status-dot" aria-hidden="true" />
												{status === 'unavailable' ? 'دليل فقط' : 'متاح'}
											</span>
										</td>
										<td>
											<button
												className="borsaty-row-analysis"
												onClick={() => navigate(`/stock/${company.symbol}`)}
											>
												تحليل السهم <span aria-hidden="true">←</span>
											</button>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
					{filtered.length === 0 && (
						<div className="borsaty-empty-state">
							لا توجد نتائج مطابقة للبحث.
						</div>
					)}
					{filtered.length > 0 && (
						<div
							className="borsaty-directory-pagination"
							aria-label="صفحات دليل الشركات"
						>
							<span>
								صفحة {safePage} من {pageCount}
							</span>
							<div>
								<button
									type="button"
									disabled={safePage === 1}
									onClick={() => setPage((current) => Math.max(1, current - 1))}
								>
									السابق
								</button>
								<button
									type="button"
									disabled={safePage === pageCount}
									onClick={() =>
										setPage((current) => Math.min(pageCount, current + 1))
									}
								>
									التالي
								</button>
							</div>
						</div>
					)}
				</div>
			) : (
				<div className="borsaty-empty-state">
					<strong>قائمة {title} غير متاحة حالياً</strong>
					<p>لن يتم عرض أسماء أو أسعار تجريبية.</p>
				</div>
			)}
		</section>
	)
}

type PublicHeaderProps = {
	live: UnifiedLive | null
	news: NewsItem[]
}

function HeaderMenu({
	id,
	label,
	openMenu,
	onToggle,
	children,
}: {
	id: string
	label: string
	openMenu: string | null
	onToggle: (id: string) => void
	children: ReactNode
}) {
	const isOpen = openMenu === id
	return (
		<div className="public-nav-group">
			<button
				onClick={() => onToggle(id)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'Enter') onToggle(id)
				}}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-controls={`public-menu-${id}`}
			>
				{label}{' '}
				<span className="public-nav-chevron" aria-hidden="true">
					⌄
				</span>
			</button>
			{isOpen && (
				<div
					id={`public-menu-${id}`}
					className="public-dropdown public-mega-menu"
					role="menu"
				>
					{children}
				</div>
			)}
		</div>
	)
}

function MenuLink({
	path,
	label,
	description,
	value,
	onSelect,
}: {
	path: string
	label: string
	description?: string
	value?: string
	onSelect: (path: string) => void
}) {
	return (
		<button
			className="public-menu-link"
			role="menuitem"
			onClick={() => onSelect(path)}
		>
			<span>
				<strong>{label}</strong>
				{description && <small>{description}</small>}
			</span>
			{value && <b>{value}</b>}
		</button>
	)
}

function PublicHeader({ live, news }: PublicHeaderProps) {
	const [openMenu, setOpenMenu] = useState<string | null>(null)
	const headerRef = useRef<HTMLElement | null>(null)
	const toggle = (menu: string) =>
		setOpenMenu((current) => (current === menu ? null : menu))
	const go = (path: string) => {
		setOpenMenu(null)
		navigate(path)
	}
	useEffect(() => {
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') setOpenMenu(null)
		}
		const closeOnOutsidePress = (event: PointerEvent) => {
			if (
				headerRef.current &&
				!headerRef.current.contains(event.target as Node)
			) {
				setOpenMenu(null)
			}
		}
		document.addEventListener('keydown', closeOnEscape)
		document.addEventListener('pointerdown', closeOnOutsidePress)
		return () => {
			document.removeEventListener('keydown', closeOnEscape)
			document.removeEventListener('pointerdown', closeOnOutsidePress)
		}
	}, [])

	const indices = live?.indices ?? {}
	const egxCount = live?.directories?.egx?.length ?? 0
	const tasiCount = live?.directories?.tasi?.length ?? 0
	return (
		<header ref={headerRef} className="borsaty-public-header">
			<button className="borsaty-public-brand" onClick={() => go('/')}>
				<span>ب</span>
				<strong>بورصتي</strong>
				<small>BORSATY</small>
			</button>
			<nav className="borsaty-public-nav" aria-label="التنقل الرئيسي">
				<HeaderMenu
					id="markets"
					label="الأسواق"
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-menu-grid public-menu-market-grid">
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">نبض السوق</span>
							<strong>الأسواق العربية</strong>
							<p>مؤشرات مصر والسعودية والسلع، مع عرض صريح عند غياب السعر.</p>
							<div className="public-menu-stats">
								<span>
									<b>{egxCount || '—'}</b> EGX
								</span>
								<span>
									<b>{tasiCount || '—'}</b> TASI
								</span>
							</div>
							<button
								className="public-menu-cta"
								onClick={() => go('/markets/egx')}
							>
								فتح مركز الأسواق ←
							</button>
						</div>
						<div className="public-menu-links">
							<MenuLink
								path="/markets/egx"
								label="البورصة المصرية"
								description="دليل EGX الكامل"
								value={formatValue(indices.egx30?.value ?? undefined)}
								onSelect={go}
							/>
							<MenuLink
								path="/markets/tasi"
								label="السوق السعودي"
								description="دليل TASI الكامل"
								value={formatValue(indices.tasi?.value ?? undefined)}
								onSelect={go}
							/>
							<MenuLink
								path="/markets/commodities"
								label="الذهب والفضة"
								description="أسعار السلع المتاحة"
								onSelect={go}
							/>
							<MenuLink
								path="/screener"
								label="فاحص الأسهم"
								description="فلترة وبحث متقدم"
								onSelect={go}
							/>
							<MenuLink
								path="/markets/forex"
								label="الفوركس"
								description="أسواق إضافية"
								onSelect={go}
							/>
							<MenuLink
								path="/markets/crypto"
								label="الأصول الرقمية"
								description="متابعة تعليمية"
								onSelect={go}
							/>
						</div>
					</div>
				</HeaderMenu>
				<HeaderMenu
					id="analysis"
					label="التحليل"
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-menu-grid public-menu-analysis-grid">
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">مختبر القرار</span>
							<strong>حلّل ثم اختبر</strong>
							<p>أدوات تعليمية منفصلة عن تنفيذ الأوامر والوساطة.</p>
							<div className="public-menu-feature">
								Elliott · Gann · RSI · Backtest
							</div>
							<button
								className="public-menu-cta"
								onClick={() => go('/analysis/elliott')}
							>
								فتح مركز التحليل ←
							</button>
						</div>
						<div className="public-menu-links">
							<MenuLink
								path="/analysis/elliott"
								label="Elliott Wave"
								description="موجات واتجاهات تعليمية"
								onSelect={go}
							/>
							<MenuLink
								path="/analysis/gann"
								label="Gann"
								description="زوايا ودورات سعرية"
								onSelect={go}
							/>
							<MenuLink
								path="/backtest"
								label="الاختبار التاريخي"
								description="قارن الفرضية بالماضي"
								onSelect={go}
							/>
							<MenuLink
								path="/strategies"
								label="منشئ الاستراتيجيات"
								description="ابنِ قواعد قابلة للمراجعة"
								onSelect={go}
							/>
							<MenuLink
								path="/compare"
								label="مقارنة الأسهم"
								description="مقارنة متعددة الرموز"
								onSelect={go}
							/>
							<MenuLink
								path="/candlestick"
								label="الشموع والمؤشرات"
								description="قراءة فنية تعليمية"
								onSelect={go}
							/>
						</div>
					</div>
				</HeaderMenu>
				<HeaderMenu
					id="news"
					label="الأخبار"
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-news-menu">
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">آخر التحديثات</span>
							<strong>أخبار السوق</strong>
							<p>عناوين تصل من خدمة الأخبار عند توفرها.</p>
						</div>
						<div className="public-news-menu-list">
							{news.length ? (
								news.slice(0, 3).map((item) => (
									<button
										key={item.id}
										role="menuitem"
										onClick={() => go('/news')}
									>
										<small>{item.category ?? 'السوق'}</small>
										<strong>{item.title}</strong>
									</button>
								))
							) : (
								<span className="public-menu-empty">
									لا توجد عناوين متاحة الآن.
								</span>
							)}
						</div>
						<button
							className="public-menu-all-link"
							onClick={() => go('/news')}
						>
							فتح مركز الأخبار ←
						</button>
					</div>
				</HeaderMenu>
				<HeaderMenu
					id="tools"
					label="الأدوات"
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-menu-grid public-menu-tools-grid">
						<div className="public-menu-links">
							<MenuLink
								path="/portfolio"
								label="المحفظة الافتراضية"
								description="محاكاة تعليمية"
								onSelect={go}
							/>
							<MenuLink
								path="/watchlists"
								label="قوائم المتابعة"
								description="تحتاج تسجيل دخول"
								onSelect={go}
							/>
							<MenuLink
								path="/alerts"
								label="التنبيهات"
								description="تحتاج تسجيل دخول"
								onSelect={go}
							/>
							<MenuLink
								path="/calendar"
								label="التقويم الاقتصادي"
								description="أحداث السوق"
								onSelect={go}
							/>
						</div>
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">مساحة العمل</span>
							<strong>أدوات قابلة للتنفيذ التعليمي</strong>
							<p>احفظ ما تراقبه وقارن الفرضيات دون تنفيذ صفقات حقيقية.</p>
							<button
								className="public-menu-cta"
								onClick={() => go('/register')}
							>
								أنشئ حساباً مجاناً
							</button>
						</div>
					</div>
				</HeaderMenu>
				<HeaderMenu
					id="learn"
					label="التعلم"
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-menu-grid public-menu-learning-grid">
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">أكاديمية بورصتي</span>
							<strong>تعلّم بإيقاعك</strong>
							<p>محتوى عربي لفهم السوق وإدارة الفرضيات والمخاطر.</p>
							<button
								className="public-menu-cta"
								onClick={() => go('/education')}
							>
								ابدأ رحلة التعلم ←
							</button>
						</div>
						<div className="public-menu-links">
							<MenuLink
								path="/education"
								label="الأكاديمية"
								description="الدورات والدروس"
								onSelect={go}
							/>
							<MenuLink
								path="/videos"
								label="مكتبة الفيديو"
								description="شروحات مرئية"
								onSelect={go}
							/>
							<MenuLink
								path="/webinars"
								label="الندوات"
								description="جلسات تعليمية"
								onSelect={go}
							/>
							<MenuLink
								path="/community"
								label="المجتمع"
								description="نقاشات المتداولين"
								onSelect={go}
							/>
							<MenuLink
								path="/community/leaderboard"
								label="المتصدرون"
								description="محاكاة تعليمية"
								onSelect={go}
							/>
						</div>
					</div>
				</HeaderMenu>
			</nav>
			<div className="borsaty-public-actions">
				<button className="borsaty-text-button" onClick={() => go('/login')}>
					دخول
				</button>
				<button
					className="borsaty-solid-button"
					onClick={() => go('/register')}
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
	const [live, setLive] = useState<UnifiedLive | null>(null)
	const [egxCompanies, setEgxCompanies] = useState<DirectoryCompany[]>([])
	const [tasiCompanies, setTasiCompanies] = useState<DirectoryCompany[]>([])

	useEffect(() => {
		let active = true
		void Promise.all([
			safeJson<UnifiedLive>('/api/v1/market/live'),
			safeJson<MarketEnvelope>('/api/market/egx/summary'),
			safeJson<MarketEnvelope>('/api/market/tasi/summary'),
			safeJson<{ data?: NewsItem[] }>('/api/news?limit=6'),
		]).then(([nextLive, nextEgx, nextTasi, nextNews]) => {
			if (!active) return
			setLive(nextLive)
			setEgx(nextEgx)
			setTasi(nextTasi)
			if (nextLive?.directories) {
				setEgxCompanies(nextLive.directories.egx ?? [])
				setTasiCompanies(nextLive.directories.tasi ?? [])
			} else {
				void Promise.all([
					safeJson<MarketEnvelope<DirectoryCompany[]>>(
						'/api/market/egx/companies',
					),
					safeJson<MarketEnvelope<DirectoryCompany[]>>(
						'/api/market/tasi/companies',
					),
				]).then(([nextEgxCompanies, nextTasiCompanies]) => {
					if (!active) return
					setEgxCompanies(
						Array.isArray(nextEgxCompanies?.data) ? nextEgxCompanies.data : [],
					)
					setTasiCompanies(
						Array.isArray(nextTasiCompanies?.data)
							? nextTasiCompanies.data
							: [],
					)
				})
			}
			setNews(
				Array.isArray(nextLive?.news)
					? nextLive.news.slice(0, 6)
					: Array.isArray(nextNews?.data)
						? nextNews.data.slice(0, 6)
						: [],
			)
		})
		return () => {
			active = false
		}
	}, [])

	const cards = useMemo<MarketCard[]>(() => {
		if (live?.indices) {
			const labels: Array<[string, string, string]> = [
				['egx30', 'EGX30', 'السوق المصري'],
				['egx70', 'EGX70', 'السوق المصري'],
				['egx100', 'EGX100', 'السوق المصري'],
				['tasi', 'TASI', 'السوق السعودي'],
				['gold', 'GOLD', 'الذهب'],
				['silver', 'SILVER', 'الفضة'],
			]
			return labels.map(([key, label, caption]) => {
				const item = live.indices?.[key]
				return {
					label,
					caption,
					value: item?.value ?? undefined,
					change: item?.changePercent ?? undefined,
					status:
						item?.available && item.freshness === 'live'
							? 'live'
							: item?.available
								? 'cached'
								: 'unavailable',
				}
			})
		}
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
				value:
					quoteValue(nested(egxData, 'egx30')) ??
					numberFrom(egxData, ['value', 'close', 'indexValue', 'egx30']),
				change:
					numberFrom(nested(egxData, 'egx30'), [
						'changePercent',
						'change_percent',
						'percentChange',
					]) ??
					numberFrom(egxData, [
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
	}, [egx, live, tasi])

	const moverPrices = useMemo(
		() => new Map((live?.topMovers ?? []).map((item) => [item.symbol, item])),
		[live?.topMovers],
	)

	const heroTitle =
		focus === 'EGX'
			? 'السوق المصري بواجهة أوضح'
			: focus === 'TASI'
				? 'تابع السوق السعودي ببصيرة'
				: 'بورصتك.. ببصيرة الذكاء الاصطناعي'

	return (
		<div className="borsaty-public-page" dir="rtl">
			<PublicHeader live={live} news={news} />
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

				<PublicMarketPulse
					cards={cards}
					egxCompanies={egxCompanies}
					tasiCompanies={tasiCompanies}
				/>

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

				<MarketDirectory
					title="كل أسهم البورصة المصرية"
					market="EGX"
					companies={egxCompanies}
					prices={moverPrices}
				/>
				<MarketDirectory
					title="كل أسهم السوق السعودي"
					market="TASI"
					companies={tasiCompanies}
					prices={new Map()}
				/>

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
			<PublicHeader live={null} news={[]} />
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
