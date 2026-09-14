import {
	useEffect,
	useState,
	type FormEvent,
	type InputHTMLAttributes,
	type ReactNode,
} from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'
import { useAuth } from '../hooks/useAuth'
import AvatarUploader from '../components/AvatarUploader'

function Shell({ children }: { children: ReactNode }) {
	const { user, logout } = useAuth()
	const [dark, setDark] = useState(
		() => localStorage.getItem('borsaty_theme') === 'dark',
	)
	const [menuOpen, setMenuOpen] = useState(false)
	const [notificationsOpen, setNotificationsOpen] = useState(false)
	const [search, setSearch] = useState('')
	useEffect(() => {
		const onShortcut = (event: KeyboardEvent) => {
			if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
				event.preventDefault()
				document.getElementById('global-search')?.focus()
			}
		}
		window.addEventListener('keydown', onShortcut)
		return () => window.removeEventListener('keydown', onShortcut)
	}, [])
	useEffect(() => {
		document.body.classList.toggle('dark-mode', dark)
		localStorage.setItem('borsaty_theme', dark ? 'dark' : 'light')
	}, [dark])
	return (
		<div className="app-shell" dir="rtl">
			<header className="topbar">
				<button className="brand" onClick={() => navigate('/dashboard')}>
					بورصتي <span>BORSATY</span>
				</button>
				<label className="global-search">
					<span aria-hidden="true">⌕</span>
					<input
						id="global-search"
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="ابحث عن سهم..."
						aria-label="ابحث عن سهم"
					/>
					<kbd>Ctrl K</kbd>
				</label>
				<nav>
					<button onClick={() => navigate('/dashboard')}>الرئيسية</button>
					<button onClick={() => navigate('/profile/me')}>الملف الشخصي</button>
					<button onClick={() => navigate('/achievements')}>الإنجازات</button>
				</nav>
				<div className="top-actions">
					<button
						className="icon-button"
						aria-label="تبديل المظهر"
						onClick={() => setDark((v) => !v)}
					>
						{dark ? '☀' : '☾'}
					</button>
					{user ? (
						<>
							<button
								className="icon-button"
								aria-label="الإشعارات"
								onClick={() => setNotificationsOpen((v) => !v)}
							>
								🔔<b>3</b>
							</button>
							{notificationsOpen && (
								<div className="top-dropdown notifications-dropdown">
									<strong>الإشعارات</strong>
									<p>لديك 3 تنبيهات مخصصة جديدة.</p>
									<button
										className="link-button"
										onClick={() => setNotificationsOpen(false)}
									>
										عرض الكل
									</button>
								</div>
							)}
							<button
								className="user-chip"
								onClick={() => setMenuOpen((v) => !v)}
							>
								{user.fullName || user.username} <span>⌄</span>
							</button>
							{menuOpen && (
								<div className="top-dropdown user-dropdown">
									<div className="dropdown-user">
										<b>{user.fullName || user.username}</b>
										<small>{user.email}</small>
										<small>مستوى متوسط · 245 XP</small>
									</div>
									<button onClick={() => navigate('/profile/me')}>
										👤 الملف الشخصي
									</button>
									<button onClick={() => navigate('/dashboard')}>
										📊 Dashboard
									</button>
									<button onClick={() => navigate('/achievements')}>
										🏆 إنجازاتي
									</button>
									<button onClick={() => navigate('/profile/me')}>
										⚙️ الإعدادات
									</button>
									<button onClick={() => void logout()}>🚪 تسجيل خروج</button>
								</div>
							)}
							<button className="ghost-button" onClick={() => void logout()}>
								خروج
							</button>
						</>
					) : (
						<>
							<button
								className="ghost-button"
								onClick={() => navigate('/login')}
							>
								تسجيل الدخول
							</button>
							<button
								className="primary-button"
								onClick={() => navigate('/register')}
							>
								سجل مجاناً
							</button>
						</>
					)}
				</div>
			</header>
			<main className="page-container">{children}</main>
		</div>
	)
}
function Field({
	label,
	...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
	return (
		<label className="field">
			<span>{label}</span>
			<input {...props} />
		</label>
	)
}
export function LoginPage() {
	const { login } = useAuth()
	const [identifier, setIdentifier] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const submit = async (e: FormEvent) => {
		e.preventDefault()
		setError('')
		try {
			await login(identifier, password)
			navigate('/dashboard')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'تعذر تسجيل الدخول')
		}
	}
	return (
		<div className="auth-page" dir="rtl">
			<section className="auth-visual">
				<div className="logo-mark">ب</div>
				<h1>
					بياناتك. قراراتك. <em>ببصيرة.</em>
				</h1>
				<p>منصة عربية ذكية لمتابعة الأسواق والتحليل المالي بطريقة أوضح.</p>
				<div className="visual-stats">
					<b>EGX</b>
					<b>TASI</b>
					<b>Gold</b>
					<b>AI</b>
				</div>
			</section>
			<form className="auth-card" onSubmit={submit}>
				<span className="eyebrow">مرحباً بعودتك</span>
				<h2>تسجيل الدخول</h2>
				<p className="muted">ادخل إلى لوحة بورصتي الشخصية</p>
				<Field
					label="البريد الإلكتروني أو اسم المستخدم"
					value={identifier}
					onChange={(e) => setIdentifier(e.target.value)}
					required
					autoComplete="username"
				/>
				<Field
					label="كلمة المرور"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					required
					autoComplete="current-password"
				/>
				{error && <div className="error-box">{error}</div>}
				<div className="form-row">
					<label>
						<input type="checkbox" /> تذكرني
					</label>
					<button
						type="button"
						className="link-button"
						onClick={() => navigate('/forgot-password')}
					>
						نسيت كلمة المرور؟
					</button>
				</div>
				<button className="primary-button full" type="submit">
					تسجيل الدخول
				</button>
				<div className="divider">أو</div>
				<p className="center muted">
					ليس لديك حساب؟{' '}
					<button
						type="button"
						className="link-button"
						onClick={() => navigate('/register')}
					>
						سجل مجاناً
					</button>
				</p>
			</form>
		</div>
	)
}
export function RegisterPage() {
	const { register } = useAuth()
	const [step, setStep] = useState(1)
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [termsAccepted, setTermsAccepted] = useState(false)
	const [data, setData] = useState({
		email: '',
		password: '',
		confirm: '',
		fullName: '',
		username: '',
		country: 'EG',
		language: 'ar',
		preferredMarkets: ['EGX'],
		experienceLevel: 'BEGINNER',
		investmentStyle: 'BALANCED',
		preferredSectors: [] as string[],
		dailyTimeCommitment: 'MEDIUM',
	})
	const update = (key: string, value: unknown) =>
		setData((prev) => ({ ...prev, [key]: value }))
	const next = () => {
		if (
			step === 1 &&
			(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email) ||
				data.password.length < 8 ||
				!/[A-Za-z]/.test(data.password) ||
				!/\d/.test(data.password) ||
				data.password !== data.confirm)
		)
			return setError(
				'أدخل بريداً صحيحاً وكلمة مرور من 8 أحرف تحتوي حروفاً وأرقاماً متطابقة',
			)
		if (step === 2 && (!data.fullName || !data.username))
			return setError('أكمل المعلومات الشخصية')
		setError('')
		setStep((s) => Math.min(4, s + 1))
	}
	const submit = async (e: FormEvent) => {
		e.preventDefault()
		if (!termsAccepted) return setError('يجب الموافقة على الشروط')
		if (submitting) return
		setSubmitting(true)
		setError('')
		try {
			await register({
				email: data.email,
				username: data.username,
				password: data.password,
				fullName: data.fullName,
				country: data.country,
				language: data.language,
				preferences: {
					preferredMarkets: data.preferredMarkets,
					experienceLevel: data.experienceLevel,
					investmentStyle: data.investmentStyle,
					preferredSectors: data.preferredSectors,
					dailyTimeCommitment: data.dailyTimeCommitment,
				},
			})
			navigate('/dashboard')
		} catch (err) {
			setError(err instanceof Error ? err.message : 'تعذر إنشاء الحساب')
		} finally {
			setSubmitting(false)
		}
	}
	return (
		<div className="auth-page" dir="rtl">
			<section className="auth-visual">
				<div className="logo-mark">ب</div>
				<h1>
					بورصتك.. ببصيرة <em>الذكاء.</em>
				</h1>
				<p>ابدأ رحلتك في فهم الأسواق المصرية والسعودية والمعادن.</p>
				<div className="benefit-list">
					<span>✓ تحليل فني تعليمي</span>
					<span>✓ قائمة متابعة شخصية</span>
					<span>✓ إنجازات ومسار تعليمي</span>
				</div>
			</section>
			<form className="auth-card register-card" onSubmit={submit}>
				<div className="stepper">
					{[1, 2, 3, 4].map((n) => (
						<span className={n <= step ? 'active' : ''} key={n}>
							{n}
						</span>
					))}
				</div>
				<span className="eyebrow">خطوة {step} من 4</span>
				<h2>
					{step === 1
						? 'أنشئ حسابك'
						: step === 2
							? 'أخبرنا عنك'
							: step === 3
								? 'خصص تجربتك'
								: 'راجع بياناتك'}
				</h2>
				{step === 1 && (
					<>
						<Field
							label="البريد الإلكتروني"
							type="email"
							value={data.email}
							onChange={(e) => update('email', e.target.value)}
							required
						/>
						<Field
							label="كلمة المرور"
							type="password"
							value={data.password}
							onChange={(e) => update('password', e.target.value)}
							required
						/>
						<div className="password-meter">
							<i className={data.password.length > 7 ? 'good' : ''} />
							<i className={data.password.length > 10 ? 'good' : ''} />
							<i className={data.password.match(/[A-Z]/) ? 'good' : ''} />
							<small>استخدم 8 أحرف على الأقل</small>
						</div>
						<Field
							label="تأكيد كلمة المرور"
							type="password"
							value={data.confirm}
							onChange={(e) => update('confirm', e.target.value)}
							required
						/>
					</>
				)}
				{step === 2 && (
					<>
						<Field
							label="الاسم الكامل"
							value={data.fullName}
							onChange={(e) => update('fullName', e.target.value)}
							required
						/>
						<Field
							label="اسم المستخدم"
							value={data.username}
							onChange={(e) => update('username', e.target.value)}
							required
						/>
						<div className="field">
							<span>الدولة</span>
							<select
								value={data.country}
								onChange={(e) => update('country', e.target.value)}
							>
								<option value="EG">مصر</option>
								<option value="SA">السعودية</option>
								<option value="AE">الإمارات</option>
							</select>
						</div>
						<div className="field">
							<span>اللغة</span>
							<select
								value={data.language}
								onChange={(e) => update('language', e.target.value)}
							>
								<option value="ar">العربية</option>
								<option value="en">English</option>
							</select>
						</div>
					</>
				)}
				{step === 3 && (
					<>
						<div className="choice-group">
							<span>الأسواق المفضلة</span>
							<div className="choice-grid">
								{['EGX', 'TASI', 'Gold', 'Silver'].map((x) => (
									<button
										type="button"
										className={
											data.preferredMarkets.includes(x)
												? 'choice selected'
												: 'choice'
										}
										onClick={() =>
											update(
												'preferredMarkets',
												data.preferredMarkets.includes(x)
													? data.preferredMarkets.filter((v) => v !== x)
													: [...data.preferredMarkets, x],
											)
										}
										key={x}
									>
										{x}
									</button>
								))}
							</div>
						</div>
						<div className="choice-group">
							<span>مستوى الخبرة</span>
							<div className="choice-grid">
								{[
									['BEGINNER', 'مبتدئ'],
									['INTERMEDIATE', 'متوسط'],
									['ADVANCED', 'محترف'],
								].map(([v, l]) => (
									<button
										type="button"
										className={
											data.experienceLevel === v ? 'choice selected' : 'choice'
										}
										onClick={() => update('experienceLevel', v)}
										key={v}
									>
										{l}
									</button>
								))}
							</div>
						</div>
						<div className="choice-group">
							<span>أسلوب الاستثمار</span>
							<div className="choice-grid">
								{[
									['CONSERVATIVE', 'محافظ'],
									['BALANCED', 'متوازن'],
									['GROWTH', 'مضارب'],
								].map(([v, l]) => (
									<button
										type="button"
										className={
											data.investmentStyle === v ? 'choice selected' : 'choice'
										}
										onClick={() => update('investmentStyle', v)}
										key={v}
									>
										{l}
									</button>
								))}
							</div>
						</div>
					</>
				)}
				{step === 4 && (
					<div className="review-box">
						<p>
							<b>الحساب:</b> {data.email}
						</p>
						<p>
							<b>الاسم:</b> {data.fullName} · @{data.username}
						</p>
						<p>
							<b>السوق:</b> {data.preferredMarkets.join('، ')}
						</p>
						<label>
							<input
								id="terms"
								type="checkbox"
								checked={termsAccepted}
								onChange={(event) => setTermsAccepted(event.target.checked)}
							/>{' '}
							أوافق على <a href="/terms">الشروط</a> و
							<a href="/disclaimer">إخلاء المسؤولية</a>
						</label>
					</div>
				)}
				{error && <div className="error-box">{error}</div>}
				<div className="form-actions">
					{step > 1 && (
						<button
							type="button"
							className="ghost-button"
							onClick={() => setStep((s) => s - 1)}
						>
							السابق
						</button>
					)}
					{step < 4 ? (
						<button type="button" className="primary-button" onClick={next}>
							التالي
						</button>
					) : (
						<button
							className="primary-button"
							type="submit"
							disabled={submitting}
						>
							{submitting ? 'جارٍ إنشاء الحساب...' : 'إنشاء الحساب'}
						</button>
					)}
				</div>
				<p className="center muted">
					لديك حساب؟{' '}
					<button
						type="button"
						className="link-button"
						onClick={() => navigate('/login')}
					>
						تسجيل الدخول
					</button>
				</p>
			</form>
		</div>
	)
}
export function ForgotPage() {
	const [sent, setSent] = useState(false)
	const [email, setEmail] = useState('')
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const submit = async (e: FormEvent) => {
		e.preventDefault()
		setLoading(true)
		setError('')
		try {
			await api('/api/auth/forgot-password', {
				method: 'POST',
				body: JSON.stringify({ email }),
			})
			setSent(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'تعذر تنفيذ الطلب')
		} finally {
			setLoading(false)
		}
	}
	return (
		<div className="simple-auth">
			<form className="auth-card" onSubmit={submit}>
				<span className="eyebrow">استعادة الحساب</span>
				<h2>نسيت كلمة المرور؟</h2>
				{sent ? (
					<div className="success-box">
						تحقق من بريدك الإلكتروني للحصول على رابط الاستعادة.
					</div>
				) : (
					<>
						<p className="muted">أدخل بريدك وسنرسل لك تعليمات آمنة.</p>
						<Field
							label="البريد الإلكتروني"
							type="email"
							value={email}
							onChange={(e) => setEmail(e.target.value)}
							required
						/>
						{error && <div className="error-box">{error}</div>}
						<button className="primary-button full" disabled={loading}>
							{loading ? 'جارٍ الإرسال...' : 'إرسال رابط الاستعادة'}
						</button>
					</>
				)}
				<button
					type="button"
					className="link-button back-link"
					onClick={() => navigate('/login')}
				>
					العودة لتسجيل الدخول
				</button>
			</form>
		</div>
	)
}
function Metric({
	label,
	value,
	tone = '',
}: {
	label: string
	value: string
	tone?: string
}) {
	return (
		<div className="metric">
			<small>{label}</small>
			<strong className={tone}>{value}</strong>
		</div>
	)
}
export function DashboardPage() {
	const { user } = useAuth()
	const [dashboard, setDashboard] = useState<any>(null)
	const [market, setMarket] = useState<
		Record<string, { value?: number; changePercent?: number }>
	>({})
	useEffect(() => {
		void api('/api/preferences/dashboard')
			.then(setDashboard)
			.catch(() =>
				setDashboard({
					recommendations: [],
					news: [],
					suggestedStocks: [],
					alerts: [],
					trending: [],
				}),
			)
	}, [])
	useEffect(() => {
		let active = true
		const loadMarket = async () => {
			try {
				const [summary, egx] = await Promise.all([
					api<any>('/api/market/summary'),
					api<any>('/api/market/egx/summary'),
				])
				if (active)
					setMarket({
						TASI: summary.tasi ?? summary.TASI,
						GOLD: summary.gold,
						SILVER: summary.silver,
						EGX30: egx.egx30,
						EGX70: egx.egx70,
						EGX100: egx.egx100,
					})
			} catch {
				if (active) setMarket({})
			}
		}
		void loadMarket()
		const timer = window.setInterval(loadMarket, 30000)
		return () => {
			active = false
			window.clearInterval(timer)
		}
	}, [])
	return (
		<Shell>
			<div className="welcome">
				<div>
					<span className="eyebrow">لوحتك الشخصية</span>
					<h1>
						مرحباً {user?.fullName || user?.username} <span>👋</span>
					</h1>
					<p>ملخصك اليومي مبني على اهتماماتك وتفضيلاتك.</p>
				</div>
				<button
					className="primary-button"
					onClick={() => navigate('/profile/me')}
				>
					تخصيص الملف
				</button>
			</div>
			<div className="metrics-grid">
				<Metric label="محفظتي" value="—" />
				<Metric label="تقدمي" value="60%" tone="positive" />
				<Metric label="مستواي" value="مبتدئ" />
				<Metric
					label="التنبيهات"
					value={`${dashboard?.alerts?.length ?? 0} نشطة`}
				/>
			</div>
			<div className="dashboard-grid">
				<section className="panel wide">
					<div className="panel-title">
						<div>
							<span className="eyebrow">مبني على اهتماماتك</span>
							<h2>🎯 توصيات مخصصة لك</h2>
						</div>
						<button className="link-button">عرض الكل</button>
					</div>
					{dashboard?.recommendations?.map((item: any, i: number) => (
						<div className="recommendation" key={i}>
							<span className="recommendation-icon">
								{item.type === 'risk' ? '⚠' : '✓'}
							</span>
							<div>
								<b>{item.title}</b>
								<p>{item.description}</p>
							</div>
							<span className={`pill ${item.priority}`}>
								{item.priority === 'high' ? 'مهم' : 'متابعة'}
							</span>
						</div>
					))}
				</section>
				<section className="panel">
					<div className="panel-title">
						<h2>نبض السوق</h2>
						<button className="link-button" onClick={() => navigate('/')}>
							عرض التقرير
						</button>
					</div>
					<div className="pulse-list">
						{['EGX30', 'EGX70', 'EGX100', 'TASI', 'GOLD', 'SILVER'].map(
							(symbol) => (
								<Metric
									key={symbol}
									label={symbol}
									value={
										market[symbol]?.value
											? `${market[symbol].value.toLocaleString()} ${market[symbol].changePercent != null ? `${market[symbol].changePercent > 0 ? '+' : ''}${market[symbol].changePercent.toFixed(2)}%` : ''}`
											: '—'
									}
									tone={
										market[symbol]?.changePercent &&
										market[symbol].changePercent > 0
											? 'positive'
											: market[symbol]?.changePercent &&
												  market[symbol].changePercent < 0
												? 'negative'
												: ''
									}
								/>
							),
						)}
					</div>
				</section>
				<section className="panel">
					<div className="panel-title">
						<h2>أخبار اهتماماتك</h2>
					</div>
					{dashboard?.news?.map((item: any, i: number) => (
						<div className="news-row" key={i}>
							<span className="news-date">{item.market}</span>
							<b>{item.topic}</b>
							<small>{item.available ? 'متاح' : 'قريباً'}</small>
						</div>
					))}
				</section>
				<section className="panel wide">
					<div className="panel-title">
						<h2>الأسهم المقترحة</h2>
						<button
							className="link-button"
							onClick={() => navigate('/profile/me')}
						>
							قائمة المتابعة
						</button>
					</div>
					<div className="stock-grid">
						{dashboard?.suggestedStocks?.map((stock: any) => (
							<button className="stock-card" key={stock.symbol}>
								<b>{stock.symbol}</b>
								<span>{stock.name}</span>
								<em>التفاصيل ←</em>
							</button>
						))}
					</div>
				</section>
			</div>
		</Shell>
	)
}
export function ProfilePage() {
	const { user } = useAuth()
	const username = window.location.pathname.split('/').pop()
	const [profile, setProfile] = useState<any>(null)
	const [tab, setTab] = useState('overview')
	const [editing, setEditing] = useState(false)
	const [editData, setEditData] = useState({
		fullName: '',
		bio: '',
		country: '',
	})
	useEffect(() => {
		void api(username === 'me' ? '/api/profile' : `/api/profile/${username}`)
			.then((r: any) => {
				const next = r.profile ?? r
				setProfile(next)
				setEditData({
					fullName: next.fullName ?? '',
					bio: next.bio ?? '',
					country: next.country ?? '',
				})
			})
			.catch(() => setProfile(user))
	}, [username])
	const p = profile || user
	return (
		<Shell>
			<div className="profile-cover">
				<div className="profile-avatar">
					{p?.avatarUrl ? (
						<img src={p.avatarUrl} alt="الصورة الشخصية" />
					) : (
						p?.fullName?.[0] || p?.username?.[0] || 'ب'
					)}
				</div>
				<div className="profile-head">
					<h1>{p?.fullName || p?.username}</h1>
					<p>@{p?.username}</p>
					<span>{p?.bio || 'مستثمر يتعلم ويحلل الأسواق بوعي.'}</span>
				</div>
				<button
					className="primary-button"
					onClick={() =>
						username === 'me' ? setEditing((v) => !v) : undefined
					}
				>
					{username === 'me'
						? 'تخصيص الملف'
						: p?.isFollowing
							? 'متابَع'
							: 'متابعة'}
				</button>
			</div>
			{editing && username === 'me' && (
				<section className="panel edit-profile-panel">
					<div className="panel-title">
						<h2>تعديل الملف</h2>
						<button className="link-button" onClick={() => setEditing(false)}>
							إلغاء
						</button>
					</div>
					<AvatarUploader
						currentUrl={p?.avatarUrl}
						onUploaded={(avatarUrl) => setProfile({ ...p, avatarUrl })}
					/>
					<Field
						label="الاسم الكامل"
						value={editData.fullName}
						onChange={(e) =>
							setEditData({ ...editData, fullName: e.target.value })
						}
					/>
					<label className="field">
						<span>نبذة عنك</span>
						<textarea
							value={editData.bio}
							maxLength={500}
							onChange={(e) =>
								setEditData({ ...editData, bio: e.target.value })
							}
						/>
					</label>
					<Field
						label="الدولة"
						value={editData.country}
						onChange={(e) =>
							setEditData({ ...editData, country: e.target.value })
						}
					/>
					<button
						className="primary-button"
						onClick={async () => {
							const result = await api<any>('/api/profile', {
								method: 'PUT',
								body: JSON.stringify(editData),
							})
							setProfile(result.profile ?? result)
							setEditing(false)
						}}
					>
						حفظ التغييرات
					</button>
				</section>
			)}
			<div className="stats-bar">
				<Metric label="المتابعون" value="—" />
				<Metric label="يتابع" value="—" />
				<Metric label="التوصيات" value="—" />
				<Metric label="الإنجازات" value="—" />
			</div>
			<div className="tabs">
				{[
					['overview', 'نظرة عامة'],
					['interests', 'الاهتمامات'],
					['achievements', 'الإنجازات'],
					['activity', 'النشاط'],
				].map(([v, l]) => (
					<button
						className={tab === v ? 'active' : ''}
						onClick={() => setTab(v)}
						key={v}
					>
						{l}
					</button>
				))}
			</div>
			<section className="panel profile-content">
				{tab === 'overview' && (
					<>
						<h2>نظرة عامة</h2>
						<div className="empty-state">
							أكمل ملفك وابدأ ببناء قائمة متابعتك الشخصية.
						</div>
					</>
				)}
				{tab === 'interests' && (
					<>
						<h2>اهتماماتي</h2>
						<div className="tag-list">
							<span>EGX</span>
							<span>TASI</span>
							<span>تحليل فني</span>
						</div>
					</>
				)}
				{tab === 'achievements' && (
					<button
						className="primary-button"
						onClick={() => navigate('/achievements')}
					>
						عرض الإنجازات
					</button>
				)}
				{tab === 'activity' && (
					<div className="empty-state">لا توجد نشاطات منشورة بعد.</div>
				)}
			</section>
		</Shell>
	)
}
export function AchievementsPage() {
	const [data, setData] = useState<any>()
	useEffect(() => {
		const load = async () => {
			const [progress, leaderboard] = await Promise.all([
				api<any>('/api/achievements/progress'),
				api<{ leaderboard: any[] }>('/api/achievements/leaderboard'),
			])
			setData({ ...progress, leaderboard: leaderboard.leaderboard })
		}
		void load().catch(() => setData({ achievements: [], leaderboard: [] }))
	}, [])
	const earned = data?.achievements?.filter((a: any) => a.completed) ?? []
	return (
		<Shell>
			<div className="achievement-hero">
				<div>
					<span className="eyebrow">رحلتك في بورصتي</span>
					<h1>🏆 إنجازاتك</h1>
					<p>كل خطوة تعلم تقرّبك من مستوى أعلى.</p>
				</div>
				<div className="xp-display">
					<strong>{data?.xp ?? 0} XP</strong>
					<span>
						المستوى {data?.level ?? 1} · {data?.title ?? 'مبتدئ'}
					</span>
				</div>
			</div>
			<div className="progress-overview">
				<div>
					<b>تقدم الإنجازات</b>
					<span>
						{earned.length}/{data?.achievements?.length ?? 20}
					</span>
				</div>
				<div className="progress-track">
					<i
						style={{
							width: `${data?.achievements?.length ? (earned.length / data.achievements.length) * 100 : 0}%`,
						}}
					/>
				</div>
			</div>
			<div className="achievement-layout">
				<section className="panel">
					<div className="panel-title">
						<h2>كل الإنجازات</h2>
					</div>
					<div className="achievement-grid">
						{data?.achievements?.map((a: any) => (
							<article
								className={`achievement-card ${a.completed ? 'earned' : 'locked'}`}
								key={a.id}
							>
								<div className="achievement-icon">{a.icon}</div>
								<b>{a.nameAr}</b>
								<small>{a.points} XP</small>
								{a.completed ? (
									<em>مكتمل ✓</em>
								) : (
									<div className="mini-progress">
										<i style={{ width: `${a.progress}%` }} />
									</div>
								)}
							</article>
						))}
					</div>
				</section>
				<section className="panel leaderboard">
					<h2>🏆 المتصدرون</h2>
					{data?.leaderboard?.map((row: any) => (
						<div className="leader-row" key={row.id}>
							<b>{row.rank}</b>
							<span>{row.fullName || row.username}</span>
							<strong>{row.xp} XP</strong>
						</div>
					))}
				</section>
			</div>
		</Shell>
	)
}

export function ResetPage() {
	const [done, setDone] = useState(false)
	const [valid, setValid] = useState<boolean | null>(null)
	const [password, setPassword] = useState('')
	const [confirm, setConfirm] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(false)
	const token = window.location.pathname.split('/').pop() ?? ''
	useEffect(() => {
		void api<{ valid: boolean }>(`/api/auth/verify-reset-token/${token}`)
			.then((result) => setValid(result.valid))
			.catch(() => setValid(false))
	}, [token])
	const submit = async (e: FormEvent) => {
		e.preventDefault()
		if (password !== confirm) return setError('كلمتا المرور غير متطابقتين')
		setLoading(true)
		setError('')
		try {
			await api('/api/auth/reset-password', {
				method: 'POST',
				body: JSON.stringify({ token, newPassword: password }),
			})
			setDone(true)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'الرابط غير صالح أو منتهي')
		} finally {
			setLoading(false)
		}
	}
	return (
		<div className="simple-auth">
			<form className="auth-card" onSubmit={submit}>
				<span className="eyebrow">حماية الحساب</span>
				<h2>إعادة تعيين كلمة المرور</h2>
				{valid === false ? (
					<div className="error-box">
						الرابط منتهي أو غير صالح. اطلب رابطاً جديداً.
					</div>
				) : done ? (
					<div className="success-box">
						تم تحديث كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن.
					</div>
				) : (
					<>
						{valid === null ? (
							<div className="loading-screen">جارٍ التحقق من الرابط...</div>
						) : (
							<>
								<Field
									label="كلمة المرور الجديدة"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									minLength={8}
									required
								/>
								<Field
									label="تأكيد كلمة المرور"
									type="password"
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									minLength={8}
									required
								/>
								{error && <div className="error-box">{error}</div>}
								<button className="primary-button full" disabled={loading}>
									{loading ? 'جارٍ الحفظ...' : 'إعادة تعيين'}
								</button>
							</>
						)}
					</>
				)}
				<button
					type="button"
					className="link-button back-link"
					onClick={() => navigate('/login')}
				>
					العودة لتسجيل الدخول
				</button>
			</form>
		</div>
	)
}
