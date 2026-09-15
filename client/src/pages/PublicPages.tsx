import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
	BarChart3,
	ChartNoAxesCombined,
	Bell,
	GraduationCap,
	Home,
	Newspaper,
	Search,
	Wrench,
} from 'lucide-react'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
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
	'1010': 'بنك الرياض',
	'1020': 'بنك الجزيرة',
	'1030': 'البنك السعودي للاستثمار',
	'1050': 'البنك السعودي الفرنسي',
	'1060': 'البنك السعودي الأول',
	'1080': 'البنك العربي الوطني',
	'1090': 'بنك البلاد',
	'1140': 'مصرف الراجحي',
	'1150': 'مصرف الإنماء',
	'1180': 'البنك الأهلي السعودي',
	'2010': 'سابك',
	'2020': 'سابك للمغذيات الزراعية',
	'2280': 'المملكة القابضة',
	'2310': 'سبكيم العالمية',
	'2380': 'بترو رابغ',
	'4001': 'أسواق العثيم',
	'4003': 'إكسترا',
	'4008': 'ساكو',
	'4190': 'جرير',
	'4191': 'أبو معطي',
	'4192': 'السيف غاليري',
	'4280': 'المملكة القابضة',
	'4290': 'الخدمات الأرضية',
	'4321': 'سينومي سنترز',
	'5110': 'كهرباء السعودية',
	'7010': 'الاتصالات السعودية',
	'7020': 'اتحاد اتصالات',
	'7030': 'زين السعودية',
}

const arabicCompanyName = (company: DirectoryCompany, displaySymbol: string) =>
	arabicCompanyNames[displaySymbol.toUpperCase()] ??
	arabicCompanyNames[company.symbol.toUpperCase()] ??
	company.name

const canonicalDirectory = (
	companies: DirectoryCompany[],
	market: 'EGX' | 'TASI',
) => {
	const seen = new Set<string>()
	return companies.filter((company) => {
		const raw = (company.displaySymbol ?? company.symbol).toUpperCase()
		const canonical = market === 'TASI' ? raw.replace(/\.SABE$/u, '') : raw
		if (seen.has(canonical)) return false
		seen.add(canonical)
		return true
	})
}

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
	const directoryCompanies = useMemo(
		() => canonicalDirectory(companies, market),
		[companies, market],
	)
	const filtered = useMemo(() => {
		const normalized = query.trim().toLowerCase()
		const matching = !normalized
			? directoryCompanies
			: directoryCompanies.filter((company) =>
					`${company.displaySymbol ?? ''} ${company.symbol} ${company.name} ${arabicCompanyName(company, company.displaySymbol ?? company.symbol)}`
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
	}, [directoryCompanies, query, sortKey])
	const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
	const safePage = Math.min(page, pageCount)
	const visibleCompanies = filtered.slice(
		(safePage - 1) * pageSize,
		safePage * pageSize,
	)
	const availableCount = directoryCompanies.filter(
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
						{filtered.length} من {directoryCompanies.length} سهم
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
			{directoryCompanies.length ? (
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
												onClick={() =>
													navigate(
														`/stock/${company.symbol}?market=${market}&name=${encodeURIComponent(arabicName)}`,
													)
												}
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
												onClick={() =>
													navigate(
														`/stock/${company.symbol}?market=${market}&name=${encodeURIComponent(arabicName)}`,
													)
												}
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
	icon: Icon,
	openMenu,
	onToggle,
	children,
}: {
	id: string
	label: string
	icon: typeof Home
	openMenu: string | null
	onToggle: (id: string) => void
	children: ReactNode
}) {
	const isOpen = openMenu === id
	return (
		<div className="public-nav-group">
			<button
				className={isOpen ? 'is-open' : undefined}
				onClick={() => onToggle(id)}
				onKeyDown={(event) => {
					if (event.key === 'ArrowDown' || event.key === 'Enter') onToggle(id)
				}}
				aria-expanded={isOpen}
				aria-haspopup="menu"
				aria-controls={`public-menu-${id}`}
			>
				<Icon size={16} strokeWidth={2.2} aria-hidden="true" />
				<span>{label}</span>{' '}
				<span className="public-nav-chevron" aria-hidden="true">
					⌄
				</span>
			</button>
			{isOpen && (
				<div
					id={`public-menu-${id}`}
					className="public-dropdown public-mega-menu"
					role="menu"
					tabIndex={-1}
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
				<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				<span className="sr-only">borsatyai</span>
			</button>
			<nav className="borsaty-public-nav" aria-label="التنقل الرئيسي">
				<button
					className="public-quick-nav is-home"
					onClick={() => go('/')}
					aria-label="الصفحة الرئيسية"
					title="الصفحة الرئيسية"
				>
					<Home size={17} strokeWidth={2.5} aria-hidden="true" />
					<span>الرئيسية</span>
				</button>
				<button
					className="public-quick-nav"
					onClick={() => go('/analysis/elliott')}
					aria-label="مركز التحليل المتقدم"
					title="مركز التحليل المتقدم"
				>
					<BarChart3 size={17} strokeWidth={2.4} aria-hidden="true" />
					<span>مركز التحليل</span>
				</button>
				<button
					className="public-quick-nav"
					onClick={() => go('/news')}
					aria-label="أخبار السوق"
					title="أخبار السوق"
				>
					<Newspaper size={17} strokeWidth={2.4} aria-hidden="true" />
					<span>الأخبار</span>
				</button>
				<button
					className="public-quick-nav"
					onClick={() =>
						window.dispatchEvent(new CustomEvent('borsaty-open-search'))
					}
					aria-label="البحث عن سهم"
					title="البحث عن سهم"
				>
					<Search size={17} strokeWidth={2.4} aria-hidden="true" />
					<span>بحث</span>
				</button>
				<HeaderMenu
					id="markets"
					label="الأسواق"
					icon={ChartNoAxesCombined}
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
					icon={BarChart3}
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
					icon={Newspaper}
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
					icon={Wrench}
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
					icon={GraduationCap}
					openMenu={openMenu}
					onToggle={toggle}
				>
					<div className="public-menu-grid public-menu-learning-grid">
						<div className="public-menu-intro">
							<span className="public-menu-eyebrow">أكاديمية borsatyai</span>
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
				<LanguageSwitcher className="public-header-language" />
				<button
					className="public-header-icon-action"
					onClick={() => go('/alerts')}
					aria-label="التنبيهات"
					title="التنبيهات"
				>
					<Bell size={17} strokeWidth={2.4} aria-hidden="true" />
				</button>
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
	const columns = [
		{
			title: 'الأسواق',
			links: [
				['EGX', '/markets/egx'],
				['TASI', '/markets/tasi'],
				['الذهب والفضة', '/markets/commodities'],
				['فاحص الأسهم', '/screener'],
				['مقارنة الأسواق', '/compare/global'],
			],
		},
		{
			title: 'التحليل والأدوات',
			links: [
				['تحليل الأسهم', '/analysis/elliott'],
				['Backtesting', '/backtest'],
				['التقويم الاقتصادي', '/calendar'],
				['المحفظة الافتراضية', '/portfolio'],
				['قوائم المتابعة', '/watchlists'],
			],
		},
		{
			title: 'المحتوى',
			links: [
				['أخبار السوق', '/news'],
				['المدونة', '/blog'],
				['أكاديمية borsatyai', '/education'],
				['مكتبة الفيديو', '/videos'],
				['مجتمع borsatyai', '/community'],
			],
		},
		{
			title: 'عن المنصة',
			links: [
				['عن borsatyai', '/about'],
				['المساعدة', '/help'],
				['الدعم', '/support'],
				['إمكانية الوصول', '/accessibility'],
				['حقوق النشر', '/copyright'],
			],
		},
	]
	return (
		<footer className="borsaty-public-footer">
			<div className="borsaty-public-footer__intro">
				<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				<p>منصة عربية تعليمية لمتابعة الأسواق والتحليل المالي.</p>
				<span>بيانات السوق · التحليل التعليمي · تجربة RTL</span>
			</div>
			<div className="borsaty-public-footer__columns">
				{columns.map((column) => (
					<nav key={column.title} aria-label={column.title}>
						<h3>{column.title}</h3>
						{column.links.map(([label, path]) => (
							<a href={path} key={path}>
								{label}
							</a>
						))}
					</nav>
				))}
			</div>
			<div className="borsaty-public-footer__bottom">
				<nav aria-label="السياسات">
					<a href="/terms">الشروط</a>
					<a href="/privacy">الخصوصية</a>
					<a href="/disclaimer">إخلاء المسؤولية</a>
					<a href="/acceptable-use">الاستخدام المقبول</a>
					<a href="/cookies">ملفات الارتباط</a>
				</nav>
				<p className="borsaty-public-footer__notice">
					المحتوى تعليمي ولا يمثل توصية استثمارية أو ضماناً للنتائج.
				</p>
			</div>
		</footer>
	)
}

function PublicPromoBanner() {
	return (
		<section
			className="borsaty-promo-banner"
			aria-label="رسالة borsatyai التعريفية"
		>
			<div className="borsaty-promo-banner__label">
				<span aria-hidden="true">✦</span>
				borsatyai · مركز التحليل العربي
			</div>
			<div className="borsaty-promo-banner__viewport">
				<div className="borsaty-promo-banner__track">
					<strong>
						منصة عربية متقدمة تجمع متابعة الأسواق والتحليل التعليمي في مساحة
						واحدة
					</strong>
					<span>مؤشرات فنية</span>
					<span>Elliott Wave</span>
					<span>Gann</span>
					<span>Consensus</span>
					<span>Backtesting</span>
					<span>أخبار وتقويم اقتصادي</span>
					<strong>
						بيانات مصر والسعودية والذهب والفضة — دون وعود أو أرقام مختلقة
					</strong>
				</div>
			</div>
			<button
				type="button"
				className="borsaty-promo-banner__action"
				onClick={() => navigate('/analysis/elliott')}
			>
				اكتشف مركز التحليل <span aria-hidden="true">←</span>
			</button>
		</section>
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
			? 'مركز التحليل المتقدم للسوق المصري'
			: focus === 'TASI'
				? 'مركز التحليل المتقدم للسوق السعودي'
				: 'منصة التحليل المتقدم للأسواق العربية'

	return (
		<div className="borsaty-public-page" dir="rtl">
			<PublicHeader live={live} news={news} />
			<PublicPromoBanner />
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
					<div
						className="borsaty-terminal-card"
						aria-label="ملخص أدوات borsatyai"
					>
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

				<section className="borsaty-market-switcher" aria-label="اختيار السوق">
					<div className="borsaty-market-switcher__intro">
						<span className="borsaty-kicker">دليل الأسواق</span>
						<h2>الأسهم العربية</h2>
						<p>اختر السوق لعرض الشركات والبيانات المتاحة فعلياً.</p>
					</div>
					<div className="borsaty-market-switcher__tabs">
						<button
							className={focus === 'EGX' ? 'is-active' : ''}
							type="button"
							onClick={() => navigate('/markets/egx')}
						>
							<BarChart3 aria-hidden="true" />
							<strong>الأسهم المصرية</strong>
							<small>EGX · 265 شركة</small>
						</button>
						<button
							className={focus === 'TASI' ? 'is-active' : ''}
							type="button"
							onClick={() => navigate('/markets/tasi')}
						>
							<ChartNoAxesCombined aria-hidden="true" />
							<strong>الأسهم السعودية</strong>
							<small>TASI · 531 شركة</small>
						</button>
						<button
							className="is-commodity"
							type="button"
							onClick={() => navigate('/markets/commodities')}
						>
							<span aria-hidden="true">Au</span>
							<strong>الذهب والفضة</strong>
							<small>أسواق السلع</small>
						</button>
					</div>
				</section>

				{focus === 'TASI' ? (
					<MarketDirectory
						title="كل أسهم السوق السعودي"
						market="TASI"
						companies={tasiCompanies}
						prices={new Map()}
					/>
				) : focus === 'EGX' ? (
					<MarketDirectory
						title="كل أسهم البورصة المصرية"
						market="EGX"
						companies={egxCompanies}
						prices={moverPrices}
					/>
				) : (
					<>
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
					</>
				)}

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

				<section className="borsaty-why">
					<div>
						<span className="borsaty-kicker">لماذا borsatyai؟</span>
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
				<section className="analysis-method-panel">
					<div className="analysis-method-panel__lead">
						<span className="borsaty-kicker">منهجية قابلة للمراجعة</span>
						<h2>كيف نبني قراءة السهم؟</h2>
						<p>
							لا نعتمد على إشارة واحدة. نعرض كل محرك منفصلاً، ثم نقارن نقاط
							الاتفاق والاختلاف قبل تكوين صورة تعليمية متوازنة.
						</p>
					</div>
					<div className="analysis-method-grid">
						{(isElliott
							? [
									[
										'01',
										'هيكل الموجات',
										'قراءة الموجة الحالية والاتجاه والسيناريو البديل.',
									],
									[
										'02',
										'السياق السعري',
										'مقارنة الحركة مع الشموع المتاحة، لا مع افتراضات غير موجودة.',
									],
									[
										'03',
										'الثقة التعليمية',
										'عرض درجة الثقة كاحتمال تحليلي لا كضمان للنتيجة.',
									],
								]
							: [
									[
										'01',
										'الزوايا والدورات',
										'قراءة الزوايا الزمنية والسعرية ضمن السلسلة المتاحة.',
									],
									[
										'02',
										'المستويات',
										'استخراج الدعم والمقاومة عندما تسمح البيانات بذلك.',
									],
									[
										'03',
										'السيناريوهات',
										'تحديد مناطق المراجعة بدلاً من تقديم هدف قطعي.',
									],
								]
						).map(([number, title, text]) => (
							<div className="analysis-method-card" key={number}>
								<strong>{number}</strong>
								<h3>{title}</h3>
								<p>{text}</p>
							</div>
						))}
					</div>
				</section>
				<section className="analysis-evidence-panel">
					<div>
						<span className="borsaty-kicker">مصفوفة الأدلة</span>
						<h2>من الإشارة إلى القرار القابل للمراجعة</h2>
					</div>
					<div className="analysis-evidence-grid">
						<span>
							<b>المؤشرات</b> RSI · MACD · SMA
						</span>
						<span>
							<b>الموجات</b> Elliott Wave
						</span>
						<span>
							<b>الزوايا</b> Gann
						</span>
						<span>
							<b>المخاطر</b> Volatility · VaR · Sharpe
						</span>
						<span>
							<b>الاختبار</b> Win rate · Drawdown
						</span>
						<span>
							<b>التوقع</b> ARIMA · LSTM
						</span>
					</div>
					<div className="analysis-method-actions">
						<button
							className="borsaty-solid-button"
							onClick={() => navigate('/stock/COMI')}
						>
							شاهد لوحة التحليل المدمج ←
						</button>
						<button
							className="borsaty-text-button"
							onClick={() => navigate('/backtest')}
						>
							اختبر الفرضية تاريخياً
						</button>
					</div>
				</section>
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
