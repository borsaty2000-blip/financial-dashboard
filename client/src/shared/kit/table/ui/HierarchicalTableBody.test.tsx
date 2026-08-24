import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
	type HierarchicalTableColumns,
	type TableDataColumn,
	type TableNodeId,
	type TableRow,
	type TableRowHeaderColumn,
} from '@client/shared/kit/table/table-types'
import HierarchicalTableBody from '@client/shared/kit/table/ui/HierarchicalTableBody'

const rowHeaderColumn: TableRowHeaderColumn = {
	key: 'entity',
	label: 'Entity',
	kind: 'row-header',
	sticky: 'left',
}

const dataColumns: TableDataColumn[] = [
	{ key: 'feb-2024', label: 'Feb 2024', kind: 'data' },
	{ key: 'mar-2024', label: 'Mar 2024', kind: 'data' },
]

const expandableRow: TableRow<number> = {
	id: 'employee-1',
	name: 'Anna Blackwood',
	imageUrl: '/api/avatars/anna-blackwood.png',
	values: [25],
	depth: 2,
	hasChildren: true,
	ancestorIds: ['company', 'branch-1'],
}

interface RenderHierarchicalTableBodyOptions {
	row?: TableRow<number>
	columnCount?: number
	expandedIds?: ReadonlySet<TableNodeId>
}

const renderHierarchicalTableBody = ({
	row = expandableRow,
	columnCount = 1,
	expandedIds = new Set(),
}: RenderHierarchicalTableBodyOptions = {}) => {
	const onToggle = vi.fn()
	const columns: HierarchicalTableColumns = [
		rowHeaderColumn,
		...dataColumns.slice(0, columnCount),
	]

	render(
		<table>
			<HierarchicalTableBody
				rows={[row]}
				columns={columns}
				expandedIds={expandedIds}
				onToggle={onToggle}
			/>
		</table>,
	)

	return {
		onToggle,
		row: screen.getByRole('row', { name: new RegExp(row.name, 'i') }),
	}
}

describe('HierarchicalTableBody', () => {
	it('toggles an expandable row only through its button', async () => {
		const user = userEvent.setup()
		const { onToggle, row } = renderHierarchicalTableBody()
		const valueCell = screen.getByRole('cell', { name: '25' })
		const toggle = screen.getByRole('button', { name: /anna blackwood/i })
		const rowHeader = screen.getByRole('rowheader', {
			name: /anna blackwood/i,
		})

		expect(valueCell).toBeInTheDocument()
		expect(row.querySelector('img')).toHaveAttribute(
			'src',
			'/api/avatars/anna-blackwood.png',
		)

		expect(row).not.toHaveAttribute('tabindex')
		expect(row).not.toHaveAttribute('aria-expanded')
		expect(row).not.toHaveClass('border-t')
		expect(rowHeader).toHaveClass(
			'sticky',
			'left-0',
			'bg-white',
			'group-hover:bg-row-hover',
			'border-t',
			'p-0',
			'w-36',
			'whitespace-normal',
		)
		expect(toggle).toHaveClass('w-full')
		expect(valueCell).toHaveClass('min-w-24')
		expect(valueCell).toHaveClass('border-t')

		await user.click(valueCell)
		expect(onToggle).not.toHaveBeenCalled()

		await user.click(toggle)

		expect(onToggle).toHaveBeenCalledOnce()
		expect(onToggle).toHaveBeenCalledWith('employee-1')
	})

	it('does not call onToggle for a leaf row', async () => {
		const user = userEvent.setup()
		const { onToggle, row } = renderHierarchicalTableBody({
			row: { ...expandableRow, imageUrl: undefined, hasChildren: false },
		})

		await user.click(row)

		expect(onToggle).not.toHaveBeenCalled()
		expect(row).not.toHaveAttribute('tabindex')
		expect(row).not.toHaveAttribute('aria-expanded')
		expect(
			screen.queryByRole('button', { name: /anna blackwood/i }),
		).not.toBeInTheDocument()
		expect(row.querySelector('img')).not.toBeInTheDocument()
	})

	it('allows an expandable row to be toggled with the keyboard', async () => {
		const user = userEvent.setup()
		const { onToggle } = renderHierarchicalTableBody()
		const toggle = screen.getByRole('button', { name: /anna blackwood/i })

		await user.tab()

		expect(toggle).toHaveFocus()

		await user.keyboard('{Enter}')
		await user.keyboard(' ')

		expect(onToggle).toHaveBeenNthCalledWith(1, 'employee-1')
		expect(onToggle).toHaveBeenNthCalledWith(2, 'employee-1')
	})

	it('ignores keyboard keys that do not toggle a row', async () => {
		const user = userEvent.setup()
		const { onToggle } = renderHierarchicalTableBody()
		const toggle = screen.getByRole('button', { name: /anna blackwood/i })

		await user.tab()

		expect(toggle).toHaveFocus()

		await user.keyboard('{ArrowDown}')

		expect(onToggle).not.toHaveBeenCalled()
	})

	it('renders the expanded state', () => {
		const { row } = renderHierarchicalTableBody({
			expandedIds: new Set([expandableRow.id]),
		})
		const toggle = screen.getByRole('button', { name: /anna blackwood/i })

		expect(toggle).toHaveAttribute('aria-expanded', 'true')
		expect(row).not.toHaveAttribute('aria-expanded')
	})

	it('renders a value for every configured data column', () => {
		renderHierarchicalTableBody({
			row: { ...expandableRow, values: [25, 26] },
			columnCount: 2,
		})

		expect(screen.getByRole('cell', { name: '25' })).toBeInTheDocument()
		expect(screen.getByRole('cell', { name: '26' })).toBeInTheDocument()
	})

	it('rejects a row with fewer values than data columns', () => {
		expect(() =>
			renderHierarchicalTableBody({
				row: { ...expandableRow, values: [25] },
				columnCount: 2,
			}),
		).toThrow(
			'Hierarchical table row "employee-1" has 1 values for 2 data columns',
		)
	})

	it('rejects a row with more values than data columns', () => {
		expect(() =>
			renderHierarchicalTableBody({
				row: { ...expandableRow, values: [25, 26] },
				columnCount: 1,
			}),
		).toThrow(
			'Hierarchical table row "employee-1" has 2 values for 1 data columns',
		)
	})
})
