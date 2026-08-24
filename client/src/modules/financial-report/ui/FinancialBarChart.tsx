import {
	type FinancialChartDataPoint,
	type FinancialChartView,
} from '@client/modules/financial-report/application/create-financial-chart-view'
import { formatPeriod } from '@client/modules/financial-report/application/utils/format-period'
import {
	StackedBarChart,
	type StackedBarChartSeries,
} from '@client/shared/kit/chart/ui/StackedBarChart'

export type FinancialBarChartProps = FinancialChartView

const barColors = [
	'var(--color-existing-clients)',
	'var(--color-new-organic)',
	'var(--color-new-paid)',
] as const

export function FinancialBarChart({ data, series }: FinancialBarChartProps) {
	const chartSeries: StackedBarChartSeries<FinancialChartDataPoint>[] =
		series.map(({ key, label }, index) => ({
			key,
			label,
			color: barColors[index % barColors.length]!,
			getValue: (point) => point.values[key] ?? 0,
		}))
	const description = series.length
		? `Monthly client totals grouped by acquisition channel: ${series.map(({ label }) => label).join(', ')}.`
		: 'Monthly client totals grouped by acquisition channel.'

	return (
		<StackedBarChart
			data={data}
			series={chartSeries}
			getXAxisValue={({ period }) => period}
			formatXAxisValue={formatPeriod}
			ariaLabel="Financial report bar chart"
			description={description}
		/>
	)
}
