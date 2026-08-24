import { type ReactNode } from 'react'

interface TableColumnBase {
	key: string
	label: ReactNode
}

export interface TableRowHeaderColumn extends TableColumnBase {
	kind: 'row-header'
	sticky?: 'left'
}

export interface TableDataColumn extends TableColumnBase {
	kind: 'data'
}

export type HierarchicalTableColumns = readonly [
	TableRowHeaderColumn,
	...TableDataColumn[],
]

export type TableNodeId = string | number

export interface TableNode<TValue = number> {
	id: TableNodeId
	name: string
	imageUrl?: string
	values: TValue[]
	children: TableNode<TValue>[]
}

export interface TableRow<TValue = number> extends Omit<
	TableNode<TValue>,
	'children'
> {
	depth: number
	hasChildren: boolean
	ancestorIds: TableNodeId[]
}
