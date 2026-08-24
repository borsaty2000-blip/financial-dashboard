import { useMemo, useState } from 'react'
import { type FinancialNodeId } from '@client/modules/financial-report/types/financial-node'
import { type FinancialTableData } from '@client/modules/financial-report/application/types/financial-table'
import HierarchicalTable from '@client/shared/kit/table/ui/HierarchicalTable'
import HierarchicalTableBody from '@client/shared/kit/table/ui/HierarchicalTableBody'
import HierarchicalTableHeader from '@client/shared/kit/table/ui/HierarchicalTableHeader'
import { type HierarchicalTableColumns } from '@client/shared/kit/table/table-types'

export interface FinancialTableProps {
	data: FinancialTableData
}

export function FinancialTable({ data }: FinancialTableProps) {
	const { rows, columns } = data
	const tableColumns: HierarchicalTableColumns = [
		{
			key: 'entity',
			label: <span className="sr-only">Entity</span>,
			kind: 'row-header',
			sticky: 'left',
		},
		...columns.map((column) => ({
			...column,
			kind: 'data' as const,
		})),
	]
	const [expandedIds, setExpandedIds] = useState<Set<FinancialNodeId>>(() => {
		const rootRow = rows[0]

		return new Set(rootRow ? [rootRow.id] : [])
	})

	const visibleRows = useMemo(
		() =>
			rows.filter((row) =>
				row.ancestorIds.every((ancestorId) => expandedIds.has(ancestorId)),
			),
		[rows, expandedIds],
	)

	const handleToggle = (id: FinancialNodeId) => {
		setExpandedIds((currentIds) => {
			const nextIds = new Set(currentIds)

			if (nextIds.has(id)) {
				nextIds.delete(id)
			} else {
				nextIds.add(id)
			}

			return nextIds
		})
	}

	return (
		<HierarchicalTable caption="Financial report by month">
			<HierarchicalTableHeader columns={tableColumns} />
			<HierarchicalTableBody
				rows={visibleRows}
				columns={tableColumns}
				expandedIds={expandedIds}
				onToggle={handleToggle}
			/>
		</HierarchicalTable>
	)
}
