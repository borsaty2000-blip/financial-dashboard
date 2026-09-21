import { useEffect, useMemo, useRef, useState } from 'react'
import {
	CandlestickSeries,
	ColorType,
	HistogramSeries,
	LineSeries,
	createChart,
	type CandlestickData,
	type IChartApi,
	type Time,
} from 'lightweight-charts'

type Candle = {
	date: string
	open: number
	high: number
	low: number
	close: number
	volume: number
}

type Point = { time: Time; value: number }

type Visibility = {
	volume: boolean
	sma20: boolean
	sma50: boolean
	sma200: boolean
	bollinger: boolean
	fibonacci: boolean
	levels: boolean
}

const average = (values: number[]) =>
	values.length
		? values.reduce((sum, value) => sum + value, 0) / values.length
		: 0

const movingAverage = (values: number[], period: number) =>
	values.map((_, index) => {
		const window = values.slice(Math.max(0, index - period + 1), index + 1)
		return { index, value: window.length >= period ? average(window) : NaN }
	})

const bollinger = (values: number[], period = 20, multiplier = 2) =>
	values.map((_, index) => {
		const window = values.slice(Math.max(0, index - period + 1), index + 1)
		if (window.length < period) return { index, upper: NaN, lower: NaN }
		const middle = average(window)
		const deviation = Math.sqrt(
			average(window.map((value) => (value - middle) ** 2)),
		)
		return {
			index,
			upper: middle + multiplier * deviation,
			lower: middle - multiplier * deviation,
		}
	})

export const calculateRSI = (values: number[], period = 14) => {
	const result = values.map(() => NaN)
	for (let index = period; index < values.length; index += 1) {
		let gains = 0
		let losses = 0
		for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
			const change = values[cursor] - values[cursor - 1]
			if (change >= 0) gains += change
			else losses -= change
		}
		const relativeStrength = losses === 0 ? 100 : gains / losses
		result[index] = 100 - 100 / (1 + relativeStrength)
	}
	return result
}

const ema = (values: number[], period: number) => {
	const result = values.map(() => NaN)
	if (values.length < period) return result
	let previous = average(values.slice(0, period))
	result[period - 1] = previous
	const multiplier = 2 / (period + 1)
	for (let index = period; index < values.length; index += 1) {
		previous = (values[index] - previous) * multiplier + previous
		result[index] = previous
	}
	return result
}

export const calculateMACD = (values: number[]) => {
	const fast = ema(values, 12)
	const slow = ema(values, 26)
	const line = values.map((_, index) =>
		Number.isFinite(fast[index]) && Number.isFinite(slow[index])
			? fast[index] - slow[index]
			: NaN,
	)
	const signal = ema(line.filter(Number.isFinite), 9)
	const alignedSignal = line.map((_, index) => {
		const signalIndex = index - 25
		return signalIndex >= 0 ? signal[signalIndex] : NaN
	})
	return {
		line,
		signal: alignedSignal,
		histogram: line.map((value, index) => value - alignedSignal[index]),
	}
}

function MiniPanel({
	label,
	values,
	color,
	min,
	max,
	guides = [],
}: {
	label: string
	values: number[]
	color: string
	min?: number
	max?: number
	guides?: number[]
}) {
	const finite = values.filter(Number.isFinite)
	if (!finite.length) return null
	const low = min ?? Math.min(...finite)
	const high = max ?? Math.max(...finite)
	const range = Math.max(high - low, 0.000001)
	const pointValues: Array<string | null> = values.map((value, index) => {
		if (!Number.isFinite(value)) return null
		const x = (index / Math.max(values.length - 1, 1)) * 100
		const y = 92 - ((value - low) / range) * 82
		return `${x},${y}`
	})
	const points = pointValues
		.filter((value): value is string => Boolean(value))
		.join(' ')
	return (
		<div className="professional-chart-panel">
			<div className="professional-chart-panel__header">
				<strong>{label}</strong>
				<span>{finite.at(-1)?.toFixed(2)}</span>
			</div>
			<svg
				viewBox="0 0 100 100"
				preserveAspectRatio="none"
				role="img"
				aria-label={label}
			>
				{guides.map((guide) => {
					const y = 92 - ((guide - low) / range) * 82
					return (
						<line
							key={guide}
							x1="0"
							x2="100"
							y1={y}
							y2={y}
							stroke="#cbd5e1"
							strokeDasharray="2 2"
						/>
					)
				})}
				<polyline
					fill="none"
					stroke={color}
					strokeWidth="1.8"
					points={points}
					vectorEffect="non-scaling-stroke"
				/>
			</svg>
		</div>
	)
}

export default function ProfessionalStockChart({
	candles,
	elliottWave,
	gannOneByOne,
}: {
	candles: Candle[]
	elliottWave?: Point[]
	gannOneByOne?: Point[]
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	const safeCandles = useMemo(() => {
		if (!Array.isArray(candles)) return []
		const unique = new Map<string, Candle>()
		for (const candle of candles) {
			if (
				!candle ||
				!candle.date ||
				!/^\d{4}-\d{2}-\d{2}$/u.test(String(candle.date)) ||
				!Number.isFinite(Date.parse(String(candle.date))) ||
				![candle.open, candle.high, candle.low, candle.close, candle.volume].every(
					Number.isFinite,
				)
			)
				continue
			const high = Math.max(candle.open, candle.high, candle.low, candle.close)
			const low = Math.min(candle.open, candle.high, candle.low, candle.close)
			unique.set(String(candle.date), { ...candle, high, low })
		}
		return [...unique.values()].sort((a, b) => a.date.localeCompare(b.date))
	}, [candles])
	const [visibility, setVisibility] = useState<Visibility>({
		volume: true,
		sma20: true,
		sma50: false,
		sma200: false,
		bollinger: false,
		fibonacci: false,
		levels: false,
	})
	const closes = useMemo(() => safeCandles.map((candle) => candle.close), [safeCandles])
	const rsiValues = useMemo(() => calculateRSI(closes), [closes])
	const macdValues = useMemo(() => calculateMACD(closes), [closes])

	const toggle = (key: keyof Visibility) =>
		setVisibility((current) => ({ ...current, [key]: !current[key] }))

	useEffect(() => {
			if (!containerRef.current || safeCandles.length < 2) return
		let chart: IChartApi | null = null
		const container = containerRef.current
		const isMobile = window.matchMedia('(max-width: 767px)').matches
		chart = createChart(container, {
			width: container.clientWidth,
			height: isMobile ? 320 : 480,
			layout: {
				background: { type: ColorType.Solid, color: '#0f172a' },
				textColor: '#dbeafe',
			},
			grid: {
				vertLines: { color: '#1e293b' },
				horzLines: { color: '#1e293b' },
			},
			rightPriceScale: {
				borderColor: '#334155',
				scaleMargins: { top: 0.08, bottom: 0.2 },
			},
			timeScale: { borderColor: '#334155', rightOffset: 4, timeVisible: false },
			crosshair: {
				vertLine: { color: '#38bdf8' },
				horzLine: { color: '#38bdf8' },
			},
			handleScroll: {
				mouseWheel: false,
				pressedMouseMove: true,
				horzTouchDrag: true,
				vertTouchDrag: false,
			},
			handleScale: { mouseWheel: false, pinch: true },
		})
			const candleData: CandlestickData[] = safeCandles.map((candle) => ({
			time: candle.date,
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
		}))
		chart
			.addSeries(CandlestickSeries, {
				upColor: '#22c55e',
				downColor: '#ef4444',
				borderVisible: false,
				wickUpColor: '#22c55e',
				wickDownColor: '#ef4444',
			})
			.setData(candleData)
		if (visibility.volume) {
			chart
				.priceScale('volume')
				.applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })
			chart
				.addSeries(HistogramSeries, {
					priceScaleId: 'volume',
					priceFormat: { type: 'volume' },
				})
					.setData(
						safeCandles.map((candle) => ({
						time: candle.date,
						value: candle.volume,
						color: candle.close >= candle.open ? '#166534aa' : '#991b1baa',
					})),
				)
		}
			const times = safeCandles.map((candle) => candle.date as Time)
		const addLine = (
			values: number[],
			color: string,
			width: 1 | 2 | 3 | 4 = 1,
		) => {
			const points = values.flatMap((value, index) =>
				Number.isFinite(value) ? [{ time: times[index], value }] : [],
			)
			if (points.length)
				chart
					?.addSeries(LineSeries, { color, lineWidth: width })
					.setData(points)
		}
		if (visibility.sma20)
			addLine(
				movingAverage(closes, 20).map((item) => item.value),
				'#facc15',
				2,
			)
		if (visibility.sma50)
			addLine(
				movingAverage(closes, 50).map((item) => item.value),
				'#fb923c',
				2,
			)
		if (visibility.sma200)
			addLine(
				movingAverage(closes, 200).map((item) => item.value),
				'#c084fc',
				2,
			)
		if (visibility.bollinger) {
			const bands = bollinger(closes)
			addLine(
				bands.map((item) => item.upper),
				'#60a5fa',
				1,
			)
			addLine(
				bands.map((item) => item.lower),
				'#60a5fa',
				1,
			)
		}
		if (visibility.levels) {
				const recent = safeCandles.slice(-60)
			const support = Math.min(...recent.map((candle) => candle.low))
			const resistance = Math.max(...recent.map((candle) => candle.high))
			addLine(
					safeCandles.map(() => support),
				'#34d399',
				1,
			)
			addLine(
					safeCandles.map(() => resistance),
				'#f87171',
				1,
			)
		}
		if (visibility.fibonacci) {
				const recent = safeCandles.slice(-120)
			const low = Math.min(...recent.map((candle) => candle.low))
			const high = Math.max(...recent.map((candle) => candle.high))
			for (const ratio of [0.236, 0.382, 0.5, 0.618, 0.786])
				addLine(
						safeCandles.map(() => high - (high - low) * ratio),
					'#a78bfa88',
					1,
				)
		}
		if (elliottWave?.length)
			addLine(
				elliottWave.map((point) => point.value),
				'#38bdf8',
				3,
			)
		if (gannOneByOne?.length)
			addLine(
				gannOneByOne.map((point) => point.value),
				'#f59e0b',
				2,
			)
		chart.timeScale().fitContent()
		const observer = new ResizeObserver(() =>
			chart?.applyOptions({ width: container.clientWidth }),
		)
		observer.observe(container)
		return () => {
			observer.disconnect()
			chart?.remove()
			chart = null
		}
	}, [safeCandles, closes, elliottWave, gannOneByOne, visibility])

	const controls: Array<[keyof Visibility, string]> = [
		['volume', 'الحجم'],
		['sma20', 'SMA20'],
		['sma50', 'SMA50'],
		['sma200', 'SMA200'],
		['bollinger', 'Bollinger'],
		['fibonacci', 'Fibonacci'],
		['levels', 'دعم/مقاومة'],
	]
	if (safeCandles.length < 2)
		return (
			<div className="professional-stock-chart professional-stock-chart--empty">
				<div className="analysis-empty-panel">لا تتوفر بيانات كافية للرسم</div>
			</div>
		)
	return (
		<div className="professional-stock-chart">
			<div
				className="professional-chart-controls"
				role="group"
				aria-label="مؤشرات الرسم"
			>
				{controls.map(([key, label]) => (
					<button
						key={key}
						type="button"
						className={visibility[key] ? 'is-active' : ''}
						onClick={() => toggle(key)}
					>
						{label}
					</button>
				))}
			</div>
			<div
				ref={containerRef}
				className="professional-chart-canvas"
				aria-label="رسم شموع احترافي"
			/>
			<div className="professional-chart-panels">
				<MiniPanel
					label="RSI (14)"
					values={rsiValues}
					color="#facc15"
					min={0}
					max={100}
					guides={[30, 50, 70]}
				/>
				<MiniPanel
					label="MACD"
					values={macdValues.line}
					color="#38bdf8"
					guides={[0]}
				/>
			</div>
		</div>
	)
}
