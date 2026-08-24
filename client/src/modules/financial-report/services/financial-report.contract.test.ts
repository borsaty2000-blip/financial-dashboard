import { readFile } from 'node:fs/promises'
import { basename, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createFinancialChartView } from '@client/modules/financial-report/application/create-financial-chart-view'
import { createFinancialTableDataView } from '@client/modules/financial-report/application/create-financial-table-data-view'
import { FinancialReportSchema } from '@client/modules/financial-report/services/utils/financial-report.schema'
import { mapFinancialReportDto } from '@client/modules/financial-report/services/utils/map-financial-report-dto'
import { validateFinancialReport } from '@client/modules/financial-report/services/utils/validate-financial-report'

describe('financial report server data contract', () => {
	it('passes the real Express dataset through the client pipeline', async () => {
		const repositoryRoot =
			basename(process.cwd()) === 'client'
				? resolve(process.cwd(), '..')
				: process.cwd()
		const source = await readFile(
			resolve(repositoryRoot, 'server/data.json'),
			'utf8',
		)
		const dto = FinancialReportSchema.parse(JSON.parse(source))
		const report = validateFinancialReport(mapFinancialReportDto(dto))
		const chartView = createFinancialChartView(report)
		const tableView = createFinancialTableDataView(report)

		expect(chartView.data).toHaveLength(report.periods.length)
		expect(tableView.columns).toHaveLength(report.periods.length)
		expect(tableView.rows[0]?.id).toBe(report.company.id)

		for (const [periodIndex, chartPoint] of chartView.data.entries()) {
			const chartTotal = Object.values(chartPoint.values).reduce(
				(total, value) => total + value,
				0,
			)
			const companyTotal = report.company.values[periodIndex]

			expect(chartPoint.period).toBe(report.periods[periodIndex])
			expect(chartTotal).toBe(companyTotal)
			expect(tableView.rows[0]?.values[periodIndex]).toBe(companyTotal)
		}
	})
})
