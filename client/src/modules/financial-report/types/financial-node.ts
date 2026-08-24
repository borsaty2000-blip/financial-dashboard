export type FinancialNodeId = string | number

export interface FinancialNodeBase {
	id: FinancialNodeId
	name: string
	values: number[]
	imageUrl?: string
}

export interface FinancialChannel extends FinancialNodeBase {
	children: []
}

export interface FinancialEmployee extends FinancialNodeBase {
	imageUrl: string
	children: FinancialChannel[]
}

export interface FinancialBranch extends FinancialNodeBase {
	children: FinancialEmployee[]
}

export interface FinancialCompany extends FinancialNodeBase {
	children: FinancialBranch[]
}

export type FinancialReportNode =
	FinancialCompany | FinancialBranch | FinancialEmployee | FinancialChannel
