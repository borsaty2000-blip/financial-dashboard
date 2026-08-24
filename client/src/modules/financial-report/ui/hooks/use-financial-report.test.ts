import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { type FinancialReportView } from '@client/modules/financial-report/application/load-financial-report-view'
import { useFinancialReport } from '@client/modules/financial-report/ui/hooks/use-financial-report'

const { loadFinancialReportViewMock } = vi.hoisted(() => ({
	loadFinancialReportViewMock: vi.fn(),
}))

vi.mock(
	'@client/modules/financial-report/financial-report.composition',
	() => ({
		loadFinancialReportView: loadFinancialReportViewMock,
	}),
)

beforeEach(() => {
	loadFinancialReportViewMock.mockReset()
})

describe('useFinancialReport', () => {
	it('aborts the active request on unmount without reporting an error', async () => {
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		let requestSignal: AbortSignal | undefined
		loadFinancialReportViewMock.mockImplementation((signal?: AbortSignal) => {
			requestSignal = signal

			return new Promise<never>((_, reject) => {
				signal?.addEventListener(
					'abort',
					() => reject(new DOMException('Request aborted', 'AbortError')),
					{ once: true },
				)
			})
		})

		const { result, unmount } = renderHook(() => useFinancialReport())

		expect(result.current).toMatchObject({ status: 'loading' })
		await waitFor(() => expect(requestSignal).toBeDefined())

		unmount()
		await act(async () => undefined)

		expect(requestSignal?.aborted).toBe(true)
		expect(consoleError).not.toHaveBeenCalled()
	})

	it('ignores a late success when the dependency cannot stop after unmount', async () => {
		const reportView: FinancialReportView = {
			financialChart: { data: [], series: [] },
			financialTableData: { rows: [], columns: [] },
		}
		let requestSignal: AbortSignal | undefined
		let resolveRequest: ((view: FinancialReportView) => void) | undefined
		loadFinancialReportViewMock.mockImplementation((signal?: AbortSignal) => {
			requestSignal = signal

			return new Promise<FinancialReportView>((resolve) => {
				resolveRequest = resolve
			})
		})

		const { unmount } = renderHook(() => useFinancialReport())

		await waitFor(() => expect(resolveRequest).toBeDefined())
		unmount()

		await act(async () => {
			resolveRequest?.(reportView)
		})

		expect(requestSignal?.aborted).toBe(true)
	})

	it('treats a timeout as a real failure while the component is mounted', async () => {
		const timeoutError = new Error('Operation timed out after 5000ms')
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		loadFinancialReportViewMock.mockRejectedValue(timeoutError)

		const { result } = renderHook(() => useFinancialReport())

		await waitFor(() => {
			expect(result.current).toMatchObject({ status: 'error' })
		})
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load financial report',
			timeoutError,
		)
	})

	it('reloads after an error and transitions through loading to success', async () => {
		const failure = new Error('Report unavailable')
		const reportView: FinancialReportView = {
			financialChart: { data: [], series: [] },
			financialTableData: { rows: [], columns: [] },
		}
		const consoleError = vi
			.spyOn(console, 'error')
			.mockImplementation(() => undefined)
		let resolveReload: ((view: FinancialReportView) => void) | undefined
		loadFinancialReportViewMock
			.mockRejectedValueOnce(failure)
			.mockImplementationOnce(
				() =>
					new Promise<FinancialReportView>((resolve) => {
						resolveReload = resolve
					}),
			)

		const { result } = renderHook(() => useFinancialReport())

		await waitFor(() => {
			expect(result.current).toMatchObject({ status: 'error' })
		})

		act(() => result.current.reload())

		expect(result.current).toMatchObject({ status: 'loading' })
		await waitFor(() => expect(resolveReload).toBeDefined())

		await act(async () => {
			resolveReload?.(reportView)
		})

		expect(result.current).toMatchObject({
			status: 'success',
			data: reportView,
		})
		expect(loadFinancialReportViewMock).toHaveBeenCalledTimes(2)
		expect(consoleError).toHaveBeenCalledWith(
			'Failed to load financial report',
			failure,
		)
	})

	it('does not let a stale request overwrite a newer reload result', async () => {
		const oldView: FinancialReportView = {
			financialChart: {
				data: [{ period: 'old', values: {} }],
				series: [],
			},
			financialTableData: { rows: [], columns: [] },
		}
		const newView: FinancialReportView = {
			financialChart: {
				data: [{ period: 'new', values: {} }],
				series: [],
			},
			financialTableData: { rows: [], columns: [] },
		}
		let firstSignal: AbortSignal | undefined
		let resolveFirst: ((view: FinancialReportView) => void) | undefined
		let resolveSecond: ((view: FinancialReportView) => void) | undefined
		loadFinancialReportViewMock
			.mockImplementationOnce((signal?: AbortSignal) => {
				firstSignal = signal

				return new Promise<FinancialReportView>((resolve) => {
					resolveFirst = resolve
				})
			})
			.mockImplementationOnce(
				() =>
					new Promise<FinancialReportView>((resolve) => {
						resolveSecond = resolve
					}),
			)

		const { result } = renderHook(() => useFinancialReport())

		await waitFor(() => expect(resolveFirst).toBeDefined())
		act(() => result.current.reload())
		await waitFor(() => expect(resolveSecond).toBeDefined())

		expect(firstSignal?.aborted).toBe(true)

		await act(async () => {
			resolveSecond?.(newView)
		})
		expect(result.current).toMatchObject({
			status: 'success',
			data: newView,
		})

		await act(async () => {
			resolveFirst?.(oldView)
		})
		expect(result.current).toMatchObject({
			status: 'success',
			data: newView,
		})
	})
})
