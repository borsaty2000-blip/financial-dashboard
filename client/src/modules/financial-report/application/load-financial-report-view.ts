import {
	createFinancialChartView,
	type FinancialChartView,
} from '@client/modules/financial-report/application/create-financial-chart-view'
import { createFinancialTableDataView } from '@client/modules/financial-report/application/create-financial-table-data-view'
import { type FinancialTableData } from '@client/modules/financial-report/application/types/financial-table'
import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'

export interface FinancialReportView {
	financialChart: FinancialChartView
	financialTableData: FinancialTableData
}

type GetFinancialReport = (signal?: AbortSignal) => Promise<FinancialReport>

export const createLoadFinancialReportView = (
	getFinancialReport: GetFinancialReport,
) => {
	return async (signal?: AbortSignal): Promise<FinancialReportView> => {
		const report = await getFinancialReport(signal)

		return {
			financialChart: createFinancialChartView(report),
			financialTableData: createFinancialTableDataView(report),
		}
	}
}
