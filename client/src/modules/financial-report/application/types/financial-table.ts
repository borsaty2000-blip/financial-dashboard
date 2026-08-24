import { type FinancialNodeId } from '@client/modules/financial-report/types/financial-node'

export interface FinancialTableColumn {
	key: string
	label: string
}

export interface FinancialTableRow {
	id: FinancialNodeId
	name: string
	imageUrl?: string
	values: number[]
	depth: number
	hasChildren: boolean
	ancestorIds: FinancialNodeId[]
}

export interface FinancialTableData {
	rows: FinancialTableRow[]
	columns: FinancialTableColumn[]
}
