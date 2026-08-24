import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FinancialBarChart } from '@client/modules/financial-report/ui/FinancialBarChart'

const chartWidth = 800
const chartHeight = 430

class ResizeObserverMock {
	observe() {}
	unobserve() {}
	disconnect() {}
}

describe('FinancialBarChart', () => {
	beforeEach(() => {
		vi.stubGlobal('ResizeObserver', ResizeObserverMock)
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			x: 0,
			y: 0,
			width: chartWidth,
			height: chartHeight,
			top: 0,
			right: chartWidth,
			bottom: chartHeight,
			left: 0,
			toJSON: () => ({}),
		})
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('names and describes the focusable Recharts surface', async () => {
		render(
			<FinancialBarChart
				data={[
					{
						period: '2024-02-01',
						values: {
							'Existing clients': 35,
							'New organic': 3,
							'New paid': 2,
						},
					},
				]}
				series={[
					{ key: 'Existing clients', label: 'Existing clients' },
					{ key: 'New organic', label: 'New organic' },
					{ key: 'New paid', label: 'New paid' },
				]}
			/>,
		)

		const chart = screen.getByRole('figure', {
			name: 'Financial report bar chart',
		})
		const surface = await screen.findByRole('application', {
			name: 'Financial report bar chart',
		})

		expect(chart).toHaveClass('chart-focus-ring')
		expect(chart.className).not.toContain(['outline', 'none'].join('-'))
		expect(surface).toHaveClass('recharts-surface')
		expect(surface).toHaveAttribute('tabindex', '0')
		expect(surface.querySelector('title')).toHaveTextContent(
			'Financial report bar chart',
		)
		expect(surface.querySelector('desc')).toHaveTextContent(
			'Monthly client totals grouped by acquisition channel: Existing clients, New organic, New paid.',
		)
		expect(chart.querySelector('figcaption')).toHaveTextContent(
			'Monthly client totals grouped by acquisition channel: Existing clients, New organic, New paid.',
		)

		await userEvent.tab()

		expect(surface).toHaveFocus()
	})
})
