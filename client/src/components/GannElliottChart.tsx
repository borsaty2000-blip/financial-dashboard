import { useEffect, useRef } from 'react'
import {
	CandlestickSeries,
	ColorType,
	LineSeries,
	createChart,
	type CandlestickData,
	type Time,
} from 'lightweight-charts'

type OverlayPoint = { time: Time; price: number }

export default function GannElliottChart({
	candles,
	elliottWave,
	gannOneByOne,
	fibonacci,
}: {
	candles: CandlestickData[]
	elliottWave?: OverlayPoint[]
	gannOneByOne?: OverlayPoint[]
	fibonacci?: OverlayPoint[]
}) {
	const containerRef = useRef<HTMLDivElement>(null)
	useEffect(() => {
		if (!containerRef.current) return
		const isMobile = window.matchMedia('(max-width: 767px)').matches
		const chart = createChart(containerRef.current, {
			height: isMobile ? 280 : 420,
			layout: {
				background: { type: ColorType.Solid, color: '#ffffff' },
				textColor: '#374151',
			},
			grid: {
				vertLines: { color: '#eef1f4' },
				horzLines: { color: '#eef1f4' },
			},
			rightPriceScale: { borderColor: '#d1d5db' },
			timeScale: { borderColor: '#d1d5db', rightOffset: 4 },
			handleScroll: {
				mouseWheel: false,
				pressedMouseMove: true,
				horzTouchDrag: true,
				vertTouchDrag: false,
			},
			handleScale: {
				axisPressedMouseMove: false,
				mouseWheel: false,
				pinch: true,
			},
		})
		const series = chart.addSeries(CandlestickSeries, {
			upColor: '#00a651',
			downColor: '#e74c3c',
			borderVisible: false,
			wickUpColor: '#00a651',
			wickDownColor: '#e74c3c',
		})
		series.setData(candles)
		const addOverlay = (data: OverlayPoint[] | undefined, color: string) => {
			if (!data?.length) return
			const line = chart.addSeries(LineSeries, { color, lineWidth: 2 })
			line.setData(data)
		}
		addOverlay(elliottWave, '#0071bc')
		addOverlay(gannOneByOne, '#f39c12')
		addOverlay(fibonacci, '#8b5cf6')
		chart.timeScale().fitContent()
		const observer = new ResizeObserver(() =>
			chart.applyOptions({ width: containerRef.current?.clientWidth ?? 0 }),
		)
		observer.observe(containerRef.current)
		return () => {
			observer.disconnect()
			chart.remove()
		}
	}, [candles, elliottWave, gannOneByOne, fibonacci])
	return (
		<div
			className="gann-elliott-chart"
			ref={containerRef}
			aria-label="رسم Elliott وGann"
		/>
	)
}
