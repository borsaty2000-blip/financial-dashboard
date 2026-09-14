import { useEffect, useRef, useState } from 'react'
import {
	Bell,
	ChartNoAxesCombined,
	Home,
	Menu,
	PieChart,
	Search,
	User,
	X,
} from 'lucide-react'
import { useLocation, navigate } from '../router'

const links = [
	['الرئيسية', '/', Home],
	['الأسواق', '/compare', ChartNoAxesCombined],
	['بحث', '/search', Search],
	['المحفظة', '/portfolio', PieChart],
	['الحساب', '/profile/me', User],
] as const
function MobileDrawer({
	open,
	onClose,
}: {
	open: boolean
	onClose: () => void
}) {
	useEffect(() => {
		document.body.style.overflow = open ? 'hidden' : ''
		return () => {
			document.body.style.overflow = ''
		}
	}, [open])
	return (
		<>
			<button
				className={open ? 'drawer-overlay open' : 'drawer-overlay'}
				aria-label="إغلاق القائمة"
				onClick={onClose}
			/>
			<aside
				className={open ? 'mobile-drawer open' : 'mobile-drawer'}
				aria-hidden={!open}
			>
				<div className="drawer-header">
					<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
					<button
						className="icon-button drawer-close"
						onClick={onClose}
						aria-label="إغلاق"
					>
						<X size={22} />
					</button>
				</div>
				<nav className="drawer-nav">
					{[
						['الأسواق والمقارنة', '/compare'],
						['Backtesting', '/backtest'],
						['أنماط الشموع', '/candlestick'],
						['محفظتي', '/portfolio'],
						['قوائم المتابعة', '/watchlists'],
						['التنبيهات', '/alerts'],
						['الإنجازات', '/achievements'],
						['الملف الشخصي', '/profile/me'],
					].map(([label, path]) => (
						<button
							key={path}
							onClick={() => {
								navigate(path)
								onClose()
							}}
						>
							{label}
						</button>
					))}
				</nav>
			</aside>
		</>
	)
}
export default function MobileChrome() {
	const location = useLocation()
	const path = location.split('?')[0]
	const [drawerOpen, setDrawerOpen] = useState(false)
	const startX = useRef<number | null>(null)
	const [pullDistance, setPullDistance] = useState(0)
	const startY = useRef<number | null>(null)
	const hidden = [
		'/login',
		'/register',
		'/forgot-password',
		'/reset-password',
		'/terms',
		'/privacy',
		'/disclaimer',
	].some((value) => path === value || path.startsWith(value + '/'))
	useEffect(() => {
		if (hidden) return
		const start = (event: TouchEvent) => {
			startX.current = event.touches[0]?.clientX ?? null
		}
		const end = (event: TouchEvent) => {
			if (startX.current == null) return
			const delta = event.changedTouches[0]?.clientX - startX.current
			if (delta < -60) setDrawerOpen(true)
			if (delta > 60) setDrawerOpen(false)
			startX.current = null
		}
		document.addEventListener('touchstart', start, { passive: true })
		document.addEventListener('touchend', end, { passive: true })
		return () => {
			document.removeEventListener('touchstart', start)
			document.removeEventListener('touchend', end)
		}
	}, [hidden])
	useEffect(() => {
		if (hidden) return
		const start = (event: TouchEvent) => {
			if (window.scrollY === 0)
				startY.current = event.touches[0]?.clientY ?? null
		}
		const move = (event: TouchEvent) => {
			if (startY.current == null || window.scrollY > 0) return
			const distance = event.touches[0]?.clientY - startY.current
			if (distance > 0) setPullDistance(Math.min(distance, 96))
		}
		const end = () => {
			if (pullDistance > 72) window.location.reload()
			setPullDistance(0)
			startY.current = null
		}
		document.addEventListener('touchstart', start, { passive: true })
		document.addEventListener('touchmove', move, { passive: true })
		document.addEventListener('touchend', end, { passive: true })
		return () => {
			document.removeEventListener('touchstart', start)
			document.removeEventListener('touchmove', move)
			document.removeEventListener('touchend', end)
		}
	}, [hidden, pullDistance])
	if (hidden) return null
	return (
		<>
			<div
				className="pull-indicator"
				style={{
					transform: `translateY(${pullDistance - 50}px)`,
					opacity: pullDistance / 72,
				}}
			>
				{pullDistance > 72 ? '↻' : '↓'}
			</div>
			<header className="mobile-topbar">
				<button
					className="mobile-icon"
					onClick={() => setDrawerOpen(true)}
					aria-label="فتح القائمة"
				>
					<Menu size={22} />
				</button>
				<button className="mobile-logo" onClick={() => navigate('/')}>
					<img src="/branding/borsatyai-logo.png" alt="BorsatyAI" />
				</button>
				<div className="mobile-actions">
					<button
						className="mobile-icon"
						onClick={() =>
							window.dispatchEvent(new CustomEvent('borsaty-open-search'))
						}
						aria-label="فتح البحث"
					>
						<Search size={20} />
					</button>
					<button
						className="mobile-icon"
						onClick={() => navigate('/alerts')}
						aria-label="التنبيهات"
					>
						<Bell size={20} />
					</button>
				</div>
			</header>
			<MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
			<nav className="bottom-nav" aria-label="التنقل الرئيسي">
				{links.map(([label, path, Icon], index) => (
					<button
						key={path}
						className={
							path === '/'
								? location === '/'
									? 'nav-item active'
									: 'nav-item'
								: location.startsWith(path)
									? 'nav-item active'
									: index === 2
										? 'nav-item central'
										: 'nav-item'
						}
						onClick={() =>
							path === '/search'
								? window.dispatchEvent(new CustomEvent('borsaty-open-search'))
								: navigate(path)
						}
					>
						<Icon
							size={index === 2 ? 22 : 19}
							strokeWidth={index === 2 ? 2.5 : 2}
						/>
						<span>{label}</span>
					</button>
				))}
			</nav>
		</>
	)
}
