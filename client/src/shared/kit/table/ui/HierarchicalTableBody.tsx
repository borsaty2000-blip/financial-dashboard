import { type CSSProperties, type ReactNode } from 'react'
import {
	type HierarchicalTableColumns,
	type TableDataColumn,
	type TableNodeId,
	type TableRow,
	type TableRowHeaderColumn,
} from '@client/shared/kit/table/table-types'

interface HierarchicalTableBodyProps<TValue extends ReactNode> {
	rows: readonly TableRow<TValue>[]
	columns: HierarchicalTableColumns
	expandedIds: ReadonlySet<TableNodeId>
	onToggle: (id: TableNodeId) => void
}

interface TableRowHeaderProps<TValue> {
	row: TableRow<TValue>
	column: TableRowHeaderColumn
	isExpanded: boolean
	onToggle: (id: TableNodeId) => void
}

interface TableValueCellsProps<TValue extends ReactNode> {
	values: readonly TValue[]
	columns: readonly TableDataColumn[]
}

function TableRowHeader<TValue>({
	row,
	column,
	isExpanded,
	onToggle,
}: TableRowHeaderProps<TValue>) {
	const label = (
		<>
			{row.imageUrl && (
				<img
					src={row.imageUrl}
					alt=""
					width={20}
					height={20}
					loading="lazy"
					decoding="async"
					className="size-5 shrink-0 rounded-full object-cover"
				/>
			)}
			{row.name}
		</>
	)

	return (
		<th
			scope="row"
			className={`text-data border-ink-subtle w-36 min-w-36 max-w-36 whitespace-normal border-t p-0 text-left font-normal sm:w-66 sm:min-w-66 sm:max-w-none sm:whitespace-nowrap ${
				column.sticky === 'left'
					? 'group-hover:bg-row-hover sticky left-0 z-10 bg-white'
					: ''
			}`}
			style={
				{
					'--row-padding-mobile': `${8 + row.depth * 16}px`,
					'--row-padding-desktop': `${16 + row.depth * 28}px`,
				} as CSSProperties
			}
		>
			{row.hasChildren ? (
				<button
					type="button"
					aria-expanded={isExpanded}
					onClick={() => onToggle(row.id)}
					className="focus-ring flex w-full cursor-pointer items-center gap-1 bg-transparent py-4.5 pr-1 pl-(--row-padding-mobile) text-left sm:gap-2 sm:pr-6 sm:pl-[var(--row-padding-desktop)]"
				>
					<span
						aria-hidden="true"
						className={`shrink-0 transition-transform ${
							isExpanded ? 'rotate-90' : ''
						}`}
					>
						{'\u203A'}
					</span>
					{label}
				</button>
			) : (
				<span className="flex w-full items-center gap-1 py-4.5 pr-1 pl-(--row-padding-mobile) sm:gap-2 sm:pr-6 sm:pl-[var(--row-padding-desktop)]">
					{label}
				</span>
			)}
		</th>
	)
}

function TableValueCells<TValue extends ReactNode>({
	values,
	columns,
}: TableValueCellsProps<TValue>) {
	return columns.map((column, columnIndex) => {
		return (
			<td
				key={column.key}
				className="text-data border-ink-subtle min-w-24 border-t px-2 py-3 text-right last:pr-6 sm:min-w-0 sm:px-3"
			>
				{values[columnIndex]}
			</td>
		)
	})
}

const assertRowsMatchColumns = <TValue,>(
	rows: readonly TableRow<TValue>[],
	dataColumnCount: number,
): void => {
	const mismatchedRow = rows.find(
		(row) => row.values.length !== dataColumnCount,
	)

	if (mismatchedRow) {
		throw new RangeError(
			`Hierarchical table row "${String(mismatchedRow.id)}" has ${mismatchedRow.values.length} values for ${dataColumnCount} data columns`,
		)
	}
}

export default function HierarchicalTableBody<TValue extends ReactNode>({
	rows,
	columns,
	expandedIds,
	onToggle,
}: HierarchicalTableBodyProps<TValue>) {
	const [rowHeaderColumn, ...dataColumns] = columns

	assertRowsMatchColumns(rows, dataColumns.length)

	return (
		<tbody>
			{rows.map((row) => {
				const isExpanded = expandedIds.has(row.id)

				return (
					<tr key={row.id} className="group hover:bg-row-hover">
						<TableRowHeader
							row={row}
							column={rowHeaderColumn}
							isExpanded={isExpanded}
							onToggle={onToggle}
						/>
						<TableValueCells values={row.values} columns={dataColumns} />
					</tr>
				)
			})}
		</tbody>
	)
}
