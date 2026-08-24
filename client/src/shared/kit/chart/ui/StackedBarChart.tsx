import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from 'recharts'

export interface StackedBarChartSeries<TPoint> {
	key: string
	label: string
	color: string
	getValue: (point: TPoint) => number
}

export interface StackedBarChartProps<TPoint> {
	data: TPoint[]
	series: readonly StackedBarChartSeries<TPoint>[]
	getXAxisValue: (point: TPoint) => string
	formatXAxisValue?: (value: string) => string
	ariaLabel: string
	description: string
}

const axisTickStyle = {
	fontFamily: 'var(--font-body)',
	fontSize: 12,
	fontWeight: 400,
	fill: 'var(--color-ink-muted)',
	letterSpacing: 0,
} as const

export function StackedBarChart<TPoint>({
	data,
	series,
	getXAxisValue,
	formatXAxisValue = String,
	ariaLabel,
	description,
}: StackedBarChartProps<TPoint>) {
	return (
		<figure
			className="
				chart-focus-ring h-107.5 min-w-0 w-full overflow-hidden
				rounded-lg bg-white px-2 py-4 sm:px-4 sm:py-6
				[&_.recharts-legend-wrapper]:translate-y-4
			"
			aria-label={ariaLabel}
		>
			<figcaption className="sr-only">{description}</figcaption>
			<ResponsiveContainer width="100%" height="100%" minWidth={0}>
				<BarChart
					data={data}
					barCategoryGap={8}
					accessibilityLayer
					title={ariaLabel}
					desc={description}
				>
					<XAxis
						dataKey={getXAxisValue}
						tickFormatter={(value) => formatXAxisValue(String(value))}
						axisLine={false}
						tickLine={false}
						tick={axisTickStyle}
						tickMargin={12}
					/>
					<YAxis
						width="auto"
						axisLine={false}
						tickLine={false}
						tick={axisTickStyle}
						domain={[0, 'dataMax + 50']}
					/>
					<CartesianGrid
						vertical={false}
						stroke="var(--color-ink)"
						strokeOpacity={0.16}
						strokeDasharray="1 6"
					/>
					<Tooltip
						labelFormatter={(value) => formatXAxisValue(String(value))}
					/>
					<Legend
						iconSize={8}
						iconType="square"
						formatter={(value) => (
							<span className="font-body text-ink-muted text-xs font-normal leading-4">
								{value}
							</span>
						)}
					/>
					{series.map(({ key, label, color, getValue }, index) => {
						const isTop = index === series.length - 1
						const isBottom = index === 0
						const radius: [number, number, number, number] = [
							isTop ? 4 : 0,
							isTop ? 4 : 0,
							isBottom ? 4 : 0,
							isBottom ? 4 : 0,
						]

						return (
							<Bar
								key={key}
								dataKey={getValue}
								name={label}
								fill={color}
								stackId="stack"
								maxBarSize={87.5}
								radius={radius}
							/>
						)
					})}
				</BarChart>
			</ResponsiveContainer>
		</figure>
	)
}
