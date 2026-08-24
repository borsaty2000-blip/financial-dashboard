import { describe, expect, it } from 'vitest'
import { createFinancialChartView } from '@client/modules/financial-report/application/create-financial-chart-view'
import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

describe('createFinancialChartView', () => {
	it('aggregates channel values and describes the available series', () => {
		expect(createFinancialChartView(financialReportFixture)).toEqual({
			data: [
				{
					period: '2024-02-01',
					values: {
						'Existing clients': 35,
						'New organic': 3,
						'New paid': 2,
					},
				},
			],
			series: [
				{
					key: 'Existing clients',
					label: 'Existing clients',
				},
				{
					key: 'New organic',
					label: 'New organic',
				},
				{
					key: 'New paid',
					label: 'New paid',
				},
			],
		})
	})

	it('rejects channel values that have no matching period', () => {
		const report: FinancialReport = {
			...financialReportFixture,
			periods: ['2024-02-01', '2024-03-01'],
		}

		expect(() => createFinancialChartView(report)).toThrow(
			'the number of channel values does not match the number of periods',
		)
	})
})
