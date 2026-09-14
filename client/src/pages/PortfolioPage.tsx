import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'

type Position = {
	symbol: string
	quantity: number
	avgPrice: number
	currentPrice: number
	marketValue: number
	unrealizedPnl: number
}
type Portfolio = {
	balance: number
	totalValue: number
	pnl: number
	initialCapital: number
	positions: Position[]
}
export function PortfolioPage() {
	const [portfolio, setPortfolio] = useState<Portfolio | null>(null)
	const [symbol, setSymbol] = useState('COMI')
	const [quantity, setQuantity] = useState('10')
	const [error, setError] = useState('')
	async function load() {
		try {
			setPortfolio(await api<Portfolio>('/api/trading/portfolio'))
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر تحميل المحفظة')
		}
	}
	useEffect(() => {
		void load()
	}, [])
	async function order(side: 'buy' | 'sell') {
		try {
			await api(`/api/trading/${side}`, {
				method: 'POST',
				body: JSON.stringify({ symbol, quantity: Number(quantity) }),
			})
			await load()
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ الأمر')
		}
	}
	return (
		<main className="tools-page" dir="rtl">
			<header className="tool-header">
				<button className="brand" onClick={() => navigate('/')}>
					بورصتي <span>BORSATY</span>
				</button>
				<nav>
					<button onClick={() => navigate('/watchlists')}>قوائمي</button>
					<button onClick={() => navigate('/alerts')}>التنبيهات</button>
				</nav>
			</header>
			<section className="tools-container">
				<p className="eyebrow">Paper Trading</p>
				<div className="page-heading">
					<h1>المحفظة الافتراضية</h1>
					<a
						className="secondary-button"
						href="/api/reports/portfolio/pdf"
						download
					>
						📄 تحميل PDF
					</a>
				</div>
				{error && <div className="analysis-error">{error}</div>}
				{portfolio && (
					<>
						<div className="analysis-metrics">
							<div className="analysis-metric">
								<span>الرصيد</span>
								<strong>{portfolio.balance.toFixed(2)}</strong>
							</div>
							<div className="analysis-metric">
								<span>القيمة الكلية</span>
								<strong>{portfolio.totalValue.toFixed(2)}</strong>
							</div>
							<div className="analysis-metric">
								<span>الربح/الخسارة</span>
								<strong>{portfolio.pnl.toFixed(2)}</strong>
							</div>
						</div>
						<div className="tool-add">
							<input
								value={symbol}
								onChange={(event) =>
									setSymbol(event.target.value.toUpperCase())
								}
							/>
							<input
								type="number"
								value={quantity}
								onChange={(event) => setQuantity(event.target.value)}
							/>
							<button className="primary-button" onClick={() => order('buy')}>
								شراء
							</button>
							<button className="ghost-button" onClick={() => order('sell')}>
								بيع
							</button>
						</div>
						<article className="tool-card">
							<h2>المراكز المفتوحة</h2>
							{portfolio.positions.map((position) => (
								<div className="tool-row" key={position.symbol}>
									<b>{position.symbol}</b>
									<span>{position.quantity} سهم</span>
									<span>{position.currentPrice.toFixed(2)}</span>
									<span>{position.unrealizedPnl.toFixed(2)}</span>
								</div>
							))}
							{!portfolio.positions.length && (
								<p className="muted">لا توجد مراكز مفتوحة.</p>
							)}
						</article>
					</>
				)}
			</section>
		</main>
	)
}
