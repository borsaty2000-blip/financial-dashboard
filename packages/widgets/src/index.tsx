import type { DragEvent, HTMLAttributes, ReactNode } from 'react'

export type WidgetType =
	| 'market-overview'
	| 'ticker'
	| 'watchlist'
	| 'heatmap'
	| 'chart'
	| 'news'
	| 'ai-insights'
	| 'economic-calendar'
	| 'portfolio'
	| 'screener'
	| 'alerts'
	| 'leaderboard'
export type WidgetLayout = {
	id: string
	type: WidgetType
	x: number
	y: number
	w: number
	h: number
	hidden?: boolean
}
export type WidgetDefinition = {
	type: WidgetType
	title: string
	minWidth: number
	defaultSize: Pick<WidgetLayout, 'w' | 'h'>
}
export const widgetRegistry: WidgetDefinition[] = [
	['market-overview', 'نظرة عامة على السوق', 280, 4, 2],
	['ticker', 'شريط الأسعار', 320, 6, 1],
	['watchlist', 'قائمة المتابعة', 280, 4, 3],
	['heatmap', 'خريطة الحرارة', 320, 6, 4],
	['chart', 'الرسم البياني', 360, 8, 5],
	['news', 'أخبار السوق', 280, 4, 3],
	['ai-insights', 'رؤى الذكاء الاصطناعي', 280, 4, 3],
	['economic-calendar', 'التقويم الاقتصادي', 280, 4, 3],
	['portfolio', 'المحفظة', 280, 4, 3],
	['screener', 'الماسح', 280, 6, 4],
	['alerts', 'التنبيهات', 280, 4, 2],
	['leaderboard', 'المتصدرون', 280, 4, 3],
].map(([type, title, minWidth, w, h]) => ({
	type: type as WidgetType,
	title: String(title),
	minWidth: Number(minWidth),
	defaultSize: { w: Number(w), h: Number(h) },
}))

export function getWidgetDefinition(type: WidgetType) {
	return widgetRegistry.find((widget) => widget.type === type)
}

type GridProps = HTMLAttributes<HTMLDivElement> & {
	layout: WidgetLayout[]
	onLayoutChange?: (layout: WidgetLayout[]) => void
	renderWidget: (widget: WidgetLayout) => ReactNode
}
export function DashboardGrid({
	layout,
	onLayoutChange,
	renderWidget,
	...props
}: GridProps) {
	const onDragStart = (event: DragEvent<HTMLElement>, id: string) =>
		event.dataTransfer.setData('text/plain', id)
	const onDrop = (event: DragEvent<HTMLElement>, targetId: string) => {
		event.preventDefault()
		const sourceId = event.dataTransfer.getData('text/plain')
		if (!sourceId || sourceId === targetId) return
		const source = layout.find((item) => item.id === sourceId)
		const target = layout.find((item) => item.id === targetId)
		if (!source || !target) return
		const next = layout.map((item) =>
			item.id === sourceId
				? { ...item, x: target.x, y: target.y }
				: item.id === targetId
					? { ...item, x: source.x, y: source.y }
					: item,
		)
		onLayoutChange?.(next)
	}
	return (
		<div
			{...props}
			className={`borsaty-dashboard-grid ${props.className ?? ''}`}
		>
			{layout
				.filter((item) => !item.hidden)
				.map((widget) => (
					<article
						key={widget.id}
						draggable
						onDragStart={(event) => onDragStart(event, widget.id)}
						onDragOver={(event) => event.preventDefault()}
						onDrop={(event) => onDrop(event, widget.id)}
						data-widget-type={widget.type}
						style={{
							gridColumn: `span ${widget.w}`,
							gridRow: `span ${widget.h}`,
						}}
					>
						{renderWidget(widget)}
					</article>
				))}
		</div>
	)
}

export type HeatmapCell = {
	symbol: string
	label: string
	changePercent: number
	value?: number | null
}
export function MarketHeatmap({ cells }: { cells: HeatmapCell[] }) {
	return (
		<div className="borsaty-market-heatmap" role="grid">
			{cells.map((cell) => {
				const magnitude = Math.min(1, Math.abs(cell.changePercent) / 5)
				const background =
					cell.changePercent > 0
						? `rgb(0 166 81 / ${0.15 + magnitude * 0.65})`
						: cell.changePercent < 0
							? `rgb(231 76 60 / ${0.15 + magnitude * 0.65})`
							: '#f1f4f7'
				return (
					<div
						key={cell.symbol}
						role="gridcell"
						title={`${cell.label}: ${cell.changePercent.toFixed(2)}%`}
						style={{ background }}
					>
						<strong>{cell.symbol}</strong>
						<span>
							{cell.changePercent > 0 ? '+' : ''}
							{cell.changePercent.toFixed(2)}%
						</span>
					</div>
				)
			})}
		</div>
	)
}

export function persistLayout(key: string, layout: WidgetLayout[]) {
	if (typeof window !== 'undefined')
		window.localStorage.setItem(
			`borsaty:dashboard:${key}`,
			JSON.stringify(layout),
		)
}
export function restoreLayout(key: string, fallback: WidgetLayout[]) {
	if (typeof window === 'undefined') return fallback
	try {
		const raw = window.localStorage.getItem(`borsaty:dashboard:${key}`)
		return raw ? (JSON.parse(raw) as WidgetLayout[]) : fallback
	} catch {
		return fallback
	}
}
