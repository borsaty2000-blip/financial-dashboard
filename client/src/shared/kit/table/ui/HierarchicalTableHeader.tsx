import { type HierarchicalTableColumns } from '@client/shared/kit/table/table-types'

interface HierarchicalTableHeaderProps {
	columns: HierarchicalTableColumns
}

export default function HierarchicalTableHeader({
	columns,
}: HierarchicalTableHeaderProps) {
	return (
		<thead>
			<tr>
				{columns.map((column) => (
					<th
						key={column.key}
						scope="col"
						className={`${
							column.kind === 'row-header'
								? 'w-36 min-w-36 max-w-36 py-3 pr-1 pl-2 text-left sm:w-66 sm:min-w-66 sm:max-w-none sm:pr-3 sm:pl-6'
								: 'text-data text-ink-muted min-w-24 whitespace-nowrap px-2 py-3 text-right font-normal last:pr-6 sm:min-w-0 sm:px-3'
						} ${
							column.kind === 'row-header' && column.sticky === 'left'
								? 'sticky left-0 z-20 bg-white'
								: ''
						}`}
					>
						{column.label}
					</th>
				))}
			</tr>
		</thead>
	)
}
