import { useMemo, useState } from 'react'
import { api } from '../lib/api'
import { navigate } from '../router'

type BacktestResult = {
	win_rate: number
	avg_return: number
	sharpe_ratio: number
	max_drawdown: number
	total_trades: number
	equity_curve: number[]
	disclaimer: string
}

type ConsensusResult = {
	score: number
	signal: string
	confidence: number
	recommendation: string
	breakdown: Record<string, { score: number; weight: number; signal: string }>
}

type CandleResult = {
	count: number
	latest: { pattern: string; direction: string; strength: string } | null
	patterns: {
		pattern: string
		direction: string
		strength: string
		date: string | number
	}[]
}

const samplePrices = ''

function parseNumbers(value: string) {
	return value
		.split(',')
		.map(Number)
		.filter((number) => Number.isFinite(number) && number > 0)
}

function EquityCurve({ values }: { values: number[] }) {
	if (values.length < 2)
		return (
			<div className="analysis-empty">
				ستظهر منحنى رأس المال بعد وجود صفقات.
			</div>
		)
	const min = Math.min(...values)
	const max = Math.max(...values)
	const points = values
		.map(
			(value, index) =>
				`${(index / (values.length - 1)) * 100},${100 - ((value - min) / Math.max(max - min, 1e-9)) * 88 - 6}`,
		)
		.join(' ')
	return (
		<svg
			className="equity-chart"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			role="img"
			aria-label="منحنى رأس المال"
		>
			<polyline
				points={points}
				fill="none"
				stroke="var(--primary)"
				strokeWidth="2"
				vectorEffect="non-scaling-stroke"
			/>
		</svg>
	)
}

function Metric({ label, value }: { label: string; value: string | number }) {
	return (
		<div className="analysis-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	)
}

export function BacktestPage() {
	const [symbol, setSymbol] = useState('COMI')
	const [period, setPeriod] = useState('1y')
	const [strategy, setStrategy] = useState('elliott')
	const [pricesText, setPricesText] = useState(samplePrices)
	const [result, setResult] = useState<BacktestResult | null>(null)
	const [consensus, setConsensus] = useState<ConsensusResult | null>(null)
	const [error, setError] = useState('')
	const prices = useMemo(() => parseNumbers(pricesText), [pricesText])
	const openCockpit = () => {
		const normalized = symbol
			.trim()
			.toUpperCase()
			.replace(/[^A-Z0-9.-]/g, '')
		if (normalized) navigate(`/stock/${normalized}`)
	}
	async function run() {
		setError('')
		setResult(null)
		try {
			const endpoint = strategy === 'indicators' ? 'indicators' : strategy
			const manual =
				prices.length >= 40
					? `&prices=${encodeURIComponent(prices.join(','))}`
					: ''
			const response = await api<{ data: BacktestResult }>(
				`/api/backtest/${symbol}/${endpoint}?lookback=${period === '3y' ? 90 : period === '2y' ? 60 : 30}${manual}`,
			)
			setResult(response.data)
			const score = await api<ConsensusResult>(
				`/api/analysis/${symbol}/consensus${manual ? `?prices=${encodeURIComponent(prices.join(','))}` : ''}`,
			)
			setConsensus(score)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر تشغيل التحليل')
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="analysis-page-header">
				<button className="link-button" onClick={() => navigate('/')}>
					العودة للرئيسية
				</button>
				<div>
					<p className="eyebrow">تحليل تاريخي</p>
					<h1>Backtesting & Consensus</h1>
					<p>
						اختبر سلوك الاستراتيجية تاريخياً، ثم قارنها بدرجة توافق المحركات.
					</p>
				</div>
				<button
					className="secondary-button"
					type="button"
					onClick={openCockpit}
				>
					فتح غرفة التحليل الكاملة ←
				</button>
			</header>
			<section className="analysis-orchestration-panel">
				<div>
					<span className="eyebrow">تحليل متعدد الطبقات</span>
					<h2>لا نخلط بين الإشارة والدليل</h2>
					<p>
						تبدأ القراءة من بيانات السعر، ثم تُراجع بالمؤشرات والموجات والزوايا،
						وتُقاس المخاطر، ثم تُختبر الفرضية تاريخياً. كل طبقة تظهر مستقلة قبل
						عرض الإجماع، وأي طبقة بلا بيانات تبقى غير متاحة.
					</p>
				</div>
				<div className="analysis-orchestration-steps">
					<span>
						<b>01</b> البيانات والاتجاه
					</span>
					<span>
						<b>02</b> المؤشرات والموجات
					</span>
					<span>
						<b>03</b> المخاطر والتوقع
					</span>
					<span>
						<b>04</b> الاختبار والإجماع
					</span>
				</div>
			</section>
			<section className="analysis-controls">
				<label>
					الرمز
					<input
						value={symbol}
						onChange={(event) => setSymbol(event.target.value.toUpperCase())}
					/>
				</label>
				<label>
					الفترة
					<select
						value={period}
						onChange={(event) => setPeriod(event.target.value)}
					>
						<option value="1y">سنة</option>
						<option value="2y">سنتان</option>
						<option value="3y">3 سنوات</option>
					</select>
				</label>
				<label>
					الاستراتيجية
					<select
						value={strategy}
						onChange={(event) => setStrategy(event.target.value)}
					>
						<option value="elliott">Elliott Wave</option>
						<option value="gann">Gann</option>
						<option value="indicators">RSI + MACD</option>
					</select>
				</label>
				<label className="wide-field">
					أسعار يدوية اختيارية
					<input
						value={pricesText}
						onChange={(event) => setPricesText(event.target.value)}
						placeholder="اتركها فارغة للجلب التلقائي"
					/>
				</label>
				<button className="primary-button" onClick={run}>
					تشغيل الاختبار
				</button>
			</section>
			{error && <div className="analysis-error">{error}</div>}
			{result && (
				<section className="analysis-grid">
					<div className="analysis-card">
						<h2>نتائج الاختبار</h2>
						<div className="analysis-metrics">
							<Metric
								label="نسبة النجاح"
								value={`${result.win_rate.toFixed(1)}%`}
							/>
							<Metric
								label="متوسط العائد"
								value={`${result.avg_return.toFixed(2)}%`}
							/>
							<Metric label="Sharpe" value={result.sharpe_ratio.toFixed(2)} />
							<Metric
								label="أقصى تراجع"
								value={`${result.max_drawdown.toFixed(2)}%`}
							/>
							<Metric label="عدد الصفقات" value={result.total_trades} />
						</div>
						<EquityCurve values={result.equity_curve} />
						<small>{result.disclaimer}</small>
					</div>
					{consensus && (
						<div className="analysis-card consensus-card">
							<h2>Consensus Score</h2>
							<strong className="consensus-score">{consensus.score}</strong>
							<span className="consensus-signal">{consensus.signal}</span>
							<p>{consensus.recommendation}</p>
							<div className="consensus-breakdown">
								{Object.entries(consensus.breakdown).map(([key, item]) => (
									<div key={key}>
										<span>{key}</span>
										<b>{item.score}</b>
										<i style={{ width: `${item.score}%` }} />
									</div>
								))}
							</div>
							<small>المؤشر تعليمي وليس توصية استثمارية.</small>
						</div>
					)}
				</section>
			)}
			{!result && (
				<div className="analysis-empty-panel">
					<strong>لا توجد نتيجة بعد</strong>
					<p>
						ألصق سلسلة أسعار تاريخية حقيقية لتشغيل الاختبار. لا يتم توليد بيانات
						بديلة.
					</p>
				</div>
			)}
		</main>
	)
}

export function CandlestickPage() {
	const [symbol, setSymbol] = useState('COMI')
	const [opens, setOpens] = useState('')
	const [highs, setHighs] = useState('')
	const [lows, setLows] = useState('')
	const [closes, setCloses] = useState('')
	const [result, setResult] = useState<CandleResult | null>(null)
	const [error, setError] = useState('')
	async function run() {
		setError('')
		setResult(null)
		try {
			const params = new URLSearchParams({ opens, highs, lows, closes })
			const response = await api<{ data: CandleResult }>(
				`/api/analysis/${symbol}/candlestick?${params}`,
			)
			setResult(response.data)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'تعذر تحليل الشموع')
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="analysis-page-header">
				<button className="link-button" onClick={() => navigate('/backtest')}>
					Backtest
				</button>
				<div>
					<p className="eyebrow">Price Action</p>
					<h1>أنماط الشموع اليابانية</h1>
					<p>كشف تعليمي للأنماط من بيانات OHLC التي تدخلها.</p>
				</div>
			</header>
			<section className="analysis-controls candle-controls">
				<label>
					الرمز
					<input
						value={symbol}
						onChange={(event) => setSymbol(event.target.value.toUpperCase())}
					/>
				</label>
				<label>
					الافتتاح
					<input
						value={opens}
						onChange={(event) => setOpens(event.target.value)}
						placeholder="100,101,..."
					/>
				</label>
				<label>
					الأعلى
					<input
						value={highs}
						onChange={(event) => setHighs(event.target.value)}
						placeholder="100,101,..."
					/>
				</label>
				<label>
					الأدنى
					<input
						value={lows}
						onChange={(event) => setLows(event.target.value)}
						placeholder="100,101,..."
					/>
				</label>
				<label>
					الإغلاق
					<input
						value={closes}
						onChange={(event) => setCloses(event.target.value)}
						placeholder="100,101,..."
					/>
				</label>
				<button className="primary-button" onClick={run}>
					تحليل الأنماط
				</button>
			</section>
			{error && <div className="analysis-error">{error}</div>}
			{result && (
				<section className="analysis-card">
					<h2>الأنماط المكتشفة: {result.count}</h2>
					{result.latest && (
						<div className="latest-pattern">
							<strong>{result.latest.pattern}</strong>
							<span>
								{result.latest.direction} · {result.latest.strength}
							</span>
						</div>
					)}
					<div className="pattern-list">
						{result.patterns.map((pattern, index) => (
							<div key={`${pattern.pattern}-${index}`}>
								<b>{pattern.pattern}</b>
								<span>{pattern.date}</span>
								<em>{pattern.direction}</em>
							</div>
						))}
					</div>
				</section>
			)}
		</main>
	)
}
