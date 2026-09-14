import type {
	ButtonHTMLAttributes,
	HTMLAttributes,
	InputHTMLAttributes,
	ReactNode,
	SelectHTMLAttributes,
} from 'react'
import { financialTokens, toneColor, type MarketTone } from './tokens'
export { financialTokens, toneColor }
export type { FinancialTokens, MarketTone } from './tokens'

type BoxProps = HTMLAttributes<HTMLDivElement> & { children?: ReactNode }
const box = (className: string, props: BoxProps) => (
	<div {...props} className={`${className} ${props.className ?? ''}`} />
)
export function AppShell(props: BoxProps) {
	return box('ds-app-shell', props)
}
export function TopBar(props: BoxProps) {
	return box('ds-top-bar', props)
}
export function SideBar(props: BoxProps) {
	return box('ds-side-bar', props)
}
export function BottomNav(props: BoxProps) {
	return box('ds-bottom-nav', props)
}
export function PageHeader(props: BoxProps) {
	return box('ds-page-header', props)
}
export function Card(props: BoxProps) {
	return box('ds-card', props)
}
export function Panel(props: BoxProps) {
	return box('ds-panel', props)
}
export function MetricCard(props: BoxProps) {
	return box('ds-metric-card', props)
}
export function ChartContainer(props: BoxProps) {
	return box('ds-chart-container', props)
}
export function FilterBar(props: BoxProps) {
	return box('ds-filter-bar', props)
}
export function DataTable(props: BoxProps) {
	return box('ds-data-table', props)
}
export function DataTableHeader(props: BoxProps) {
	return box('ds-data-table-header', props)
}
export function DataTableRow(props: BoxProps) {
	return box('ds-data-table-row', props)
}
export function Tabs(props: BoxProps) {
	return box('ds-tabs', props)
}
export function TabList(props: BoxProps) {
	return box('ds-tab-list', props)
}
export function Tab(props: BoxProps) {
	return box('ds-tab', props)
}
export function Modal(props: BoxProps) {
	return box('ds-modal', props)
}
export function Tooltip(props: BoxProps) {
	return box('ds-tooltip', props)
}
export function Toast(props: BoxProps) {
	return box('ds-toast', props)
}
export function EmptyState(props: BoxProps) {
	return box('ds-empty-state', props)
}
export function ErrorState(props: BoxProps) {
	return box('ds-error-state', props)
}
export function Skeleton(props: BoxProps) {
	return box('ds-skeleton', props)
}
export function Progress(props: BoxProps) {
	return box('ds-progress', props)
}
export function Button({
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button {...props} className={`ds-button ${props.className ?? ''}`}>
			{children}
		</button>
	)
}
export function IconButton({
	children,
	...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
	return (
		<button
			{...props}
			aria-label={props['aria-label'] ?? 'button'}
			className={`ds-icon-button ${props.className ?? ''}`}
		>
			{children}
		</button>
	)
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
	return <input {...props} className={`ds-input ${props.className ?? ''}`} />
}
export function Select({
	children,
	...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
	return (
		<select {...props} className={`ds-select ${props.className ?? ''}`}>
			{children}
		</select>
	)
}
export function Badge({
	children,
	tone = 'neutral',
}: {
	children?: ReactNode
	tone?: MarketTone
}) {
	return (
		<span className="ds-badge" style={{ color: toneColor(tone) }}>
			{children}
		</span>
	)
}
export function StatusDot({ tone = 'neutral' }: { tone?: MarketTone }) {
	return (
		<span
			className="ds-status-dot"
			style={{ background: toneColor(tone) }}
			aria-label={tone}
		/>
	)
}
export function PriceChange({
	value,
	tone,
}: {
	value: number
	tone?: MarketTone
}) {
	const resolved =
		tone ?? (value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral')
	return (
		<span className="ds-price-change" style={{ color: toneColor(resolved) }}>
			{value > 0 ? '+' : ''}
			{value.toFixed(2)}%
		</span>
	)
}
export function CurrencyValue({
	value,
	currency = 'EGP',
}: {
	value: number | null
	currency?: string
}) {
	return (
		<span className="ds-currency-value">
			{value == null
				? '—'
				: `${value.toLocaleString('en-US', { maximumFractionDigits: 2 })} ${currency}`}
		</span>
	)
}
export function NumberValue({
	value,
	decimals = 2,
}: {
	value: number | null
	decimals?: number
}) {
	return (
		<span className="ds-number-value">
			{value == null
				? '—'
				: value.toLocaleString('en-US', { maximumFractionDigits: decimals })}
		</span>
	)
}
export function PriceBadge({
	price,
	change,
	currency = 'EGP',
}: {
	price: number | null
	change?: number
	currency?: string
}) {
	return (
		<span className="ds-price-badge">
			<CurrencyValue value={price} currency={currency} />
			{change != null && <PriceChange value={change} />}
		</span>
	)
}
export function MarketChip({
	market,
	tone = 'neutral',
}: {
	market: string
	tone?: MarketTone
}) {
	return <Badge tone={tone}>{market}</Badge>
}
export function RiskBadge({ level }: { level: 'low' | 'medium' | 'high' }) {
	return (
		<Badge
			tone={
				level === 'low' ? 'positive' : level === 'high' ? 'negative' : 'warning'
			}
		>
			{level}
		</Badge>
	)
}
export function Sparkline({ values }: { values: number[] }) {
	const min = Math.min(...values)
	const max = Math.max(...values)
	const points = values
		.map(
			(value, index) =>
				`${(index / Math.max(1, values.length - 1)) * 100},${100 - ((value - min) / Math.max(0.0001, max - min)) * 100}`,
		)
		.join(' ')
	return (
		<svg
			className="ds-sparkline"
			viewBox="0 0 100 100"
			preserveAspectRatio="none"
			role="img"
			aria-label="sparkline"
		>
			<polyline
				points={points}
				fill="none"
				stroke={financialTokens.color.primary}
				strokeWidth="3"
			/>
		</svg>
	)
}
export function Avatar({ src, name }: { src?: string; name: string }) {
	return src ? (
		<img className="ds-avatar" src={src} alt={name} />
	) : (
		<span className="ds-avatar ds-avatar-fallback">{name.slice(0, 1)}</span>
	)
}
export function Divider(props: BoxProps) {
	return box('ds-divider', props)
}
export function Accordion(props: BoxProps) {
	return box('ds-accordion', props)
}
export function CommandPalette(props: BoxProps) {
	return box('ds-command-palette', props)
}
export function Pagination(props: BoxProps) {
	return box('ds-pagination', props)
}
export function LoadingOverlay(props: BoxProps) {
	return box('ds-loading-overlay', props)
}
export function Disclosure(props: BoxProps) {
	return box('ds-disclosure', props)
}
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
	return (
		<Input
			{...props}
			inputMode="decimal"
			className={`ds-number-input ${props.className ?? ''}`}
		/>
	)
}
