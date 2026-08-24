import { createLoadFinancialReportView } from '@client/modules/financial-report/application/load-financial-report-view'
import { financialReportApiAdapter } from '@client/modules/financial-report/services/financial-report-api-adapter'

const { getFinancialReport } = financialReportApiAdapter()

export const loadFinancialReportView =
	createLoadFinancialReportView(getFinancialReport)
