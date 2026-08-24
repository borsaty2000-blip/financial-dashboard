import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { createFinancialTableDataView } from '@client/modules/financial-report/application/create-financial-table-data-view'
import { financialReportFixture } from '@client/test/fixtures/financial-report'
import { FinancialTable } from '@client/modules/financial-report/ui/FinancialTable'

describe('FinancialTable', () => {
	it('shows and hides descendants when their parent row is toggled', async () => {
		const user = userEvent.setup()

		render(
			<FinancialTable
				data={createFinancialTableDataView(financialReportFixture)}
			/>,
		)

		expect(
			screen.getByRole('region', { name: 'Financial report by month' }),
		).toHaveAttribute('tabindex', '0')
		expect(
			screen.getByRole('region', { name: 'Financial report by month' }),
		).toHaveClass('table-focus-ring')
		expect(
			screen.getByRole('table', { name: 'Financial report by month' }),
		).toBeInTheDocument()
		expect(screen.getByRole('columnheader', { name: 'Entity' })).toHaveClass(
			'sticky',
			'left-0',
			'bg-white',
		)
		expect(screen.getByText('Branch 1')).toBeInTheDocument()
		expect(screen.getByText('Branch 2')).toBeInTheDocument()
		expect(screen.queryByText('Anna Blackwood')).not.toBeInTheDocument()

		const branchToggle = screen.getByRole('button', { name: /branch 1/i })

		await user.click(branchToggle)

		expect(screen.getByText('Anna Blackwood')).toBeInTheDocument()

		await user.click(branchToggle)

		expect(screen.queryByText('Anna Blackwood')).not.toBeInTheDocument()
	})
})
