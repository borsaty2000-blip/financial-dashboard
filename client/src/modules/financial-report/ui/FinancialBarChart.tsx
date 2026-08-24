import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import { type FinancialChartDataPoint } from "@client/modules/financial-report/application/create-financial-chart-data";
import { formatPeriod } from "@client/modules/financial-report/utils/format-period";

interface FinancialBarChartProps {
	data: FinancialChartDataPoint[];
}

const axisTickStyle = {
	fontFamily: "var(--font-body)",
	fontSize: 12,
	fontWeight: 400,
	fill: "var(--color-ink-muted)",
	letterSpacing: 0,
} as const;

const barMeta = [
	{
		dataKey: "existingClients",
		name: "Existing clients",
		fill: "var(--color-existing-clients)",
	},
	{
		dataKey: "newOrganic",
		name: "New organic",
		fill: "var(--color-new-organic)",
	},
	{
		dataKey: "newPaid",
		name: "New paid",
		fill: "var(--color-new-paid)",
	},
] as const;

export function FinancialBarChart({ data }: FinancialBarChartProps) {
	return (
		<figure
			className="
				chart-focus-ring h-107.5 min-w-0 overflow-hidden
				w-full rounded-lg bg-white
				px-2 py-4 sm:px-4 sm:py-6
				[&_.recharts-legend-wrapper]:translate-y-4
				[&_.recharts-wrapper_*:focus]:outline-none
			"
			aria-label="Financial report bar chart"
		>
			<figcaption className="sr-only">
				Monthly stacked bar chart showing existing clients, new organic clients,
				and new paid clients.
			</figcaption>
			<ResponsiveContainer width="100%" height="100%" minWidth={0}>
				<BarChart
					data={data}
					barCategoryGap={8}
					accessibilityLayer
					desc="Monthly client totals grouped by acquisition channel"
				>
					<XAxis
						dataKey="period"
						tickFormatter={formatPeriod}
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
						domain={[0, "dataMax + 50"]}
					/>
					<CartesianGrid
						vertical={false}
						stroke="var(--color-ink)"
						strokeOpacity={0.16}
						strokeDasharray="1 6"
					/>
					<Tooltip labelFormatter={(period) => formatPeriod(String(period))} />
					<Legend
						iconSize={8}
						iconType="square"
						formatter={(value) => (
							<span className="font-body text-ink-muted text-xs font-normal leading-4">
								{value}
							</span>
						)}
					/>
					{barMeta.map(({ dataKey, name, fill }, index) => {
						const isTop = index === barMeta.length - 1;
						const isBottom = index === 0;
						const radius: [number, number, number, number] = [
							isTop ? 4 : 0,
							isTop ? 4 : 0,
							isBottom ? 4 : 0,
							isBottom ? 4 : 0,
						];

						return (
							<Bar
								key={dataKey}
								dataKey={dataKey}
								name={name}
								fill={fill}
								stackId="clients"
								maxBarSize={87.5}
								radius={radius}
							/>
						);
					})}
				</BarChart>
			</ResponsiveContainer>
		</figure>
	);
}
