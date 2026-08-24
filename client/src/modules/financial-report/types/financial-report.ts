import { type FinancialCompany } from '@client/modules/financial-report/types/financial-node'

export interface FinancialReport {
	periods: string[]
	company: FinancialCompany
}
