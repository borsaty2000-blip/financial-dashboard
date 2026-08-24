import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'
import { createApplicationError } from '@client/shared/errors/application-error'

export interface FinancialChartDataPoint {
	period: string
	values: Record<string, number>
}

export interface FinancialChartSeries {
	key: string
	label: string
}

export interface FinancialChartView {
	data: FinancialChartDataPoint[]
	series: FinancialChartSeries[]
}

export const createFinancialChartView = (
	report: FinancialReport,
): FinancialChartView => {
	const data: FinancialChartDataPoint[] = report.periods.map((period) => ({
		period,
		values: {},
	}))
	const seriesByKey = new Map<string, FinancialChartSeries>()

	for (const branch of report.company.children) {
		for (const employee of branch.children) {
			for (const channel of employee.children) {
				if (channel.values.length !== report.periods.length) {
					throw createApplicationError(
						'inconsistent-data',
						'Financial report data is inconsistent: the number of channel values does not match the number of periods',
						{
							meta: {
								channelId: channel.id,
								channelName: channel.name,
								periodsCount: report.periods.length,
								valuesCount: channel.values.length,
							},
						},
					)
				}

				if (!seriesByKey.has(channel.name)) {
					seriesByKey.set(channel.name, {
						key: channel.name,
						label: channel.name,
					})
				}

				channel.values.forEach((value, index) => {
					const point = data[index]!.values

					point[channel.name] = (point[channel.name] ?? 0) + value
				})
			}
		}
	}

	return {
		data,
		series: Array.from(seriesByKey.values()),
	}
}
