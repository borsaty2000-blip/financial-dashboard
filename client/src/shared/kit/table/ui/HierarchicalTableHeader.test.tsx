import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { type HierarchicalTableColumns } from '@client/shared/kit/table/table-types'
import HierarchicalTableHeader from '@client/shared/kit/table/ui/HierarchicalTableHeader'

describe('HierarchicalTableHeader', () => {
	it('renders every configured column without making the first one sticky', () => {
		const columns: HierarchicalTableColumns = [
			{ key: 'name', label: 'Name', kind: 'row-header' },
			{ key: 'email', label: 'Email', kind: 'data' },
			{ key: 'role', label: 'Role', kind: 'data' },
		]

		render(
			<table>
				<HierarchicalTableHeader columns={columns} />
			</table>,
		)

		const columnHeaders = screen.getAllByRole('columnheader')

		expect(columnHeaders).toHaveLength(columns.length)
		expect(screen.getByRole('columnheader', { name: 'Name' })).not.toHaveClass(
			'sticky',
		)
	})
})
