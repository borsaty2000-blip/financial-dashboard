import { describe, expect, it, vi } from 'vitest'
import { createLoadFinancialReportView } from '@client/modules/financial-report/application/load-financial-report-view'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

describe('createLoadFinancialReportView', () => {
	it('loads the domain report and composes both UI projections', async () => {
		const controller = new AbortController()
		const getFinancialReport = vi.fn().mockResolvedValue(financialReportFixture)
		const loadFinancialReportView =
			createLoadFinancialReportView(getFinancialReport)

		const view = await loadFinancialReportView(controller.signal)

		expect(getFinancialReport).toHaveBeenCalledOnce()
		expect(getFinancialReport).toHaveBeenCalledWith(controller.signal)
		expect(view.financialChart).toMatchObject({
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
		})
		expect(view.financialTableData.columns).toEqual([
			{ key: '2024-02-01', label: 'Feb 2024' },
		])
		expect(view.financialTableData.rows[0]).toMatchObject({
			id: 'company',
			name: 'Company',
			depth: 0,
		})
	})

	it('propagates a loading failure without replacing its error', async () => {
		const failure = new Error('Report unavailable')
		const getFinancialReport = vi.fn().mockRejectedValue(failure)
		const loadFinancialReportView =
			createLoadFinancialReportView(getFinancialReport)

		await expect(loadFinancialReportView()).rejects.toBe(failure)
		expect(getFinancialReport).toHaveBeenCalledOnce()
	})
})
