import {
	type FinancialNodeId,
	type FinancialReportNode,
} from '@client/modules/financial-report/types/financial-node'

import { type FinancialTableRow } from '@client/modules/financial-report/application/types/financial-table'

export const flattenFinancialReportData = (
	root: FinancialReportNode,
): FinancialTableRow[] => {
	const rows: FinancialTableRow[] = []

	const stack: Array<{
		node: FinancialReportNode
		depth: number
		ancestorIds: FinancialNodeId[]
	}> = [
		{
			node: root,
			depth: 0,
			ancestorIds: [],
		},
	]

	while (stack.length > 0) {
		const { node, depth, ancestorIds } = stack.pop()!

		rows.push({
			id: node.id,
			name: node.name,
			imageUrl: node.imageUrl,
			values: node.values,
			depth,
			hasChildren: node.children.length > 0,
			ancestorIds,
		})

		for (let index = node.children.length - 1; index >= 0; index -= 1) {
			const child = node.children[index]!

			stack.push({
				node: child,
				depth: depth + 1,
				ancestorIds: [...ancestorIds, node.id],
			})
		}
	}

	return rows
}
