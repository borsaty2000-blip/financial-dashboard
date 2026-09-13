import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'
import { StockListSkeleton } from '../components/Skeletons'

type Item = { symbol: string; market: string }
type Watchlist = { id: string; name: string; items: Item[] }
type Alert = {
	id: string
	symbol: string
	condition: string
	targetValue: number
	isActive: boolean
}
type Notification = { id: string; title: string; body: string; isRead: boolean }

function Header({
	notifications,
	onReadAll,
}: {
	notifications: Notification[]
	onReadAll: () => void
}) {
	const [open, setOpen] = useState(false)
	return (
		<header className="tool-header">
			<button className="brand" onClick={() => navigate('/')}>
				بورصتي <span>BORSATY</span>
			</button>
			<nav>
				<button onClick={() => navigate('/watchlists')}>قوائمي</button>
				<button onClick={() => navigate('/alerts')}>التنبيهات</button>
				<button onClick={() => navigate('/portfolio')}>المحفظة</button>
			</nav>
			<div className="notification-wrap">
				<button
					className="icon-button light-icon"
					onClick={() => setOpen((value) => !value)}
				>
					🔔 {notifications.filter((item) => !item.isRead).length || ''}
				</button>
				{open && (
					<div className="notification-menu">
						<strong>الإشعارات</strong>
						{notifications.slice(0, 5).map((item) => (
							<p key={item.id}>
								<b>{item.title}</b>
								<br />
								{item.body}
							</p>
						))}
						{!notifications.length && <p>لا توجد إشعارات.</p>}
						<button className="link-button" onClick={onReadAll}>
							تحديد الكل كمقروء
						</button>
					</div>
				)}
			</div>
		</header>
	)
}

export function WatchlistsPage() {
	const [lists, setLists] = useState<Watchlist[]>([])
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [symbol, setSymbol] = useState('')
	const [error, setError] = useState('')
	const [loading, setLoading] = useState(true)
	async function load() {
		setLoading(true)
		try {
			const [watchlists, notes] = await Promise.all([
				api<Watchlist[]>('/api/watchlists'),
				api<Notification[]>('/api/notifications'),
			])
			setLists(watchlists)
			setNotifications(notes)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر تحميل القوائم')
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		void load()
	}, [])
	async function add() {
		if (!symbol.trim()) return
		const list =
			lists[0] ??
			(await api<Watchlist>('/api/watchlists', {
				method: 'POST',
				body: JSON.stringify({ name: 'قائمتي' }),
			}))
		await api(`/api/watchlists/${list.id}/items`, {
			method: 'POST',
			body: JSON.stringify({ symbol }),
		})
		setSymbol('')
		void load()
	}
	return (
		<main className="tools-page" dir="rtl">
			<Header
				notifications={notifications}
				onReadAll={() =>
					api('/api/notifications/read-all', { method: 'PUT' }).then(() =>
						load(),
					)
				}
			/>
			<section className="tools-container">
				<p className="eyebrow">متابعة السوق</p>
				<h1>قوائم المتابعة</h1>
				<div className="tool-add">
					<input
						value={symbol}
						onChange={(event) => setSymbol(event.target.value.toUpperCase())}
						placeholder="رمز السهم مثل COMI"
					/>
					<button className="primary-button" onClick={add}>
						أضف للمتابعة
					</button>
				</div>
				{error && <div className="analysis-error">{error}</div>}
				{loading ? (
					<StockListSkeleton />
				) : (
					lists.map((list) => (
						<article className="tool-card" key={list.id}>
							<h2>{list.name}</h2>
							{list.items.length ? (
								list.items.map((item) => (
									<div className="tool-row" key={item.symbol}>
										<b>{item.symbol}</b>
										<span>{item.market}</span>
										<button
											className="link-button"
											onClick={() => navigate(`/stock/${item.symbol}`)}
										>
											التفاصيل
										</button>
									</div>
								))
							) : (
								<p className="muted">لم تضف أسهماً بعد.</p>
							)}
						</article>
					))
				)}
			</section>
		</main>
	)
}

export function AlertsPage() {
	const [alerts, setAlerts] = useState<Alert[]>([])
	const [symbol, setSymbol] = useState('COMI')
	const [target, setTarget] = useState('100')
	const [condition, setCondition] = useState('ABOVE')
	const [notifications, setNotifications] = useState<Notification[]>([])
	const [loading, setLoading] = useState(true)
	async function load() {
		setLoading(true)
		try {
			const [data, notes] = await Promise.all([
				api<Alert[]>('/api/alerts'),
				api<Notification[]>('/api/notifications'),
			])
			setAlerts(data)
			setNotifications(notes)
		} finally {
			setLoading(false)
		}
	}
	useEffect(() => {
		void load()
	}, [])
	async function create() {
		await api('/api/alerts', {
			method: 'POST',
			body: JSON.stringify({ symbol, condition, targetValue: Number(target) }),
		})
		void load()
	}
	return (
		<main className="tools-page" dir="rtl">
			<Header
				notifications={notifications}
				onReadAll={() =>
					api('/api/notifications/read-all', { method: 'PUT' }).then(() =>
						load(),
					)
				}
			/>
			<section className="tools-container">
				<p className="eyebrow">تنبيهات شخصية</p>
				<h1>تنبيهات الأسعار</h1>
				<div className="tool-add">
					<input
						value={symbol}
						onChange={(event) => setSymbol(event.target.value.toUpperCase())}
					/>
					<select
						value={condition}
						onChange={(event) => setCondition(event.target.value)}
					>
						<option value="ABOVE">فوق</option>
						<option value="BELOW">تحت</option>
					</select>
					<input
						type="number"
						value={target}
						onChange={(event) => setTarget(event.target.value)}
					/>
					<button className="primary-button" onClick={create}>
						إنشاء تنبيه
					</button>
				</div>
				{loading ? (
					<StockListSkeleton />
				) : (
					<article className="tool-card">
						{alerts.map((alert) => (
							<div className="tool-row" key={alert.id}>
								<b>{alert.symbol}</b>
								<span>
									{alert.condition} {alert.targetValue}
								</span>
								<span>{alert.isActive ? 'نشط' : 'تم التفعيل'}</span>
								<button
									className="link-button"
									onClick={() =>
										api(`/api/alerts/${alert.id}`, { method: 'DELETE' }).then(
											() => load(),
										)
									}
								>
									حذف
								</button>
							</div>
						))}
					</article>
				)}
			</section>
		</main>
	)
}
