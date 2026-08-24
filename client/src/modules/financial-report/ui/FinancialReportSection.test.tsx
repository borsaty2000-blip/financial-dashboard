import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { type FinancialChartView } from '@client/modules/financial-report/application/create-financial-chart-view'
import { type FinancialTableData } from '@client/modules/financial-report/application/types/financial-table'
import { financialReportFixture } from '@client/test/fixtures/financial-report'
import FinancialReportSection from './FinancialReportSection'

vi.mock('@client/modules/financial-report/ui/FinancialBarChart', () => {
	function FinancialBarChart({ data }: FinancialChartView) {
		return <div data-testid="financial-chart">{data.length} data points</div>
	}

	return { FinancialBarChart }
})

vi.mock('@client/modules/financial-report/ui/FinancialTable', () => {
	function FinancialTable({ data }: { data: FinancialTableData }) {
		return <div data-testid="financial-table">{data.rows[0]?.name}</div>
	}

	return { FinancialTable }
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('FinancialReportSection', () => {
	it('renders a loading state while the report is loading', () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(() => new Promise<Response>(() => undefined)),
		)

		render(<FinancialReportSection />)

		expect(screen.getByRole('region', { name: 'Clients' })).toHaveAttribute(
			'aria-busy',
			'true',
		)
		expect(screen.getByRole('status')).toHaveTextContent(
			'Loading financial report...',
		)
		expect(screen.queryByTestId('financial-chart')).not.toBeInTheDocument()
		expect(screen.queryByTestId('financial-table')).not.toBeInTheDocument()
	})

	it('renders the report after a successful response', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => financialReportFixture,
			}),
		)

		render(<FinancialReportSection />)

		expect(await screen.findByTestId('financial-table')).toHaveTextContent(
			'Company',
		)
		expect(screen.getByTestId('financial-chart')).toHaveTextContent(
			'1 data points',
		)
		expect(screen.getByRole('region', { name: 'Clients' })).toHaveAttribute(
			'aria-busy',
			'false',
		)
		expect(screen.queryByRole('status')).not.toBeInTheDocument()
	})

	it('renders an error state when the request fails', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)

		vi.stubGlobal(
			'fetch',
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			}),
		)

		render(<FinancialReportSection />)

		expect(await screen.findByRole('alert')).toHaveTextContent(
			'Failed to load financial report',
		)
		expect(screen.queryByTestId('financial-chart')).not.toBeInTheDocument()
		expect(screen.queryByTestId('financial-table')).not.toBeInTheDocument()
		expect(
			screen.getByRole('button', { name: 'Try again' }),
		).toBeInTheDocument()

		consoleError.mockRestore()
	})

	it('allows the user to retry a failed request', async () => {
		const user = userEvent.setup()
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		let resolveReload: ((response: Response) => void) | undefined
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValueOnce(
				new Response(null, { status: 500, statusText: 'Unavailable' }),
			)
			.mockResolvedValueOnce(
				new Response(null, { status: 500, statusText: 'Unavailable' }),
			)
			.mockResolvedValueOnce(
				new Response(null, { status: 500, statusText: 'Unavailable' }),
			)
			.mockImplementationOnce(
				() =>
					new Promise<Response>((resolve) => {
						resolveReload = resolve
					}),
			)
		vi.stubGlobal('fetch', fetchMock)

		render(<FinancialReportSection />)

		await user.click(await screen.findByRole('button', { name: 'Try again' }))

		expect(screen.getByRole('status')).toHaveTextContent(
			'Loading financial report...',
		)
		await waitFor(() => expect(resolveReload).toBeDefined())

		resolveReload?.(
			new Response(JSON.stringify(financialReportFixture), { status: 200 }),
		)

		expect(await screen.findByTestId('financial-table')).toHaveTextContent(
			'Company',
		)
		expect(fetchMock).toHaveBeenCalledTimes(4)
		expect(consoleError).toHaveBeenCalledOnce()
	})
})
