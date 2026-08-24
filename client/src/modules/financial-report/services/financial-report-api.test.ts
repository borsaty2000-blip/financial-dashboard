import { afterEach, describe, expect, it, vi } from 'vitest'
import { financialReportApi } from '@client/modules/financial-report/services/financial-report-api'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('financialReportApi', () => {
	it('fetches and parses the financial report response', async () => {
		const payload = { periods: ['2024-02-01'] }
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(new Response(JSON.stringify(payload), { status: 200 }))
		const controller = new AbortController()
		vi.stubGlobal('fetch', fetchMock)

		const { fetchFinancialReport } = financialReportApi()

		await expect(fetchFinancialReport(controller.signal)).resolves.toEqual(
			payload,
		)
		expect(fetchMock).toHaveBeenCalledWith('/api/financial-report', {
			signal: controller.signal,
		})
	})

	it('classifies a fetch rejection as a network error', async () => {
		const cause = new TypeError('Network unavailable')
		vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(cause))

		const { fetchFinancialReport } = financialReportApi()

		await expect(
			fetchFinancialReport(new AbortController().signal),
		).rejects.toMatchObject({
			layer: 'http',
			type: 'network',
			cause,
		})
	})

	it('preserves an aborted fetch as an abort error', async () => {
		const cause = new DOMException('Request aborted', 'AbortError')
		vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockRejectedValue(cause))

		const { fetchFinancialReport } = financialReportApi()

		await expect(
			fetchFinancialReport(new AbortController().signal),
		).rejects.toMatchObject({
			layer: 'http',
			type: 'abort',
			cause,
		})
	})

	it('includes response metadata in a bad-response error', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn<typeof fetch>()
				.mockResolvedValue(
					new Response(null, { status: 503, statusText: 'Unavailable' }),
				),
		)

		const { fetchFinancialReport } = financialReportApi()

		await expect(
			fetchFinancialReport(new AbortController().signal),
		).rejects.toMatchObject({
			layer: 'http',
			type: 'bad-response',
			meta: {
				status: 503,
				statusText: 'Unavailable',
			},
		})
	})

	it('classifies malformed response JSON separately from network failures', async () => {
		vi.stubGlobal(
			'fetch',
			vi
				.fn<typeof fetch>()
				.mockResolvedValue(new Response('{invalid-json', { status: 200 })),
		)

		const { fetchFinancialReport } = financialReportApi()

		await expect(
			fetchFinancialReport(new AbortController().signal),
		).rejects.toMatchObject({
			layer: 'http',
			type: 'invalid-json',
			cause: expect.any(SyntaxError),
		})
	})

	it('classifies a response body stream failure as a network error', async () => {
		const cause = new TypeError('Response body stream terminated')
		const response = new Response(null, { status: 200 })
		vi.spyOn(response, 'json').mockRejectedValue(cause)
		vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))

		const { fetchFinancialReport } = financialReportApi()

		await expect(
			fetchFinancialReport(new AbortController().signal),
		).rejects.toMatchObject({
			layer: 'http',
			type: 'network',
			cause,
		})
	})

	it('preserves cancellation while reading the response body', async () => {
		const controller = new AbortController()
		const cause = new DOMException('Request aborted', 'AbortError')
		const response = new Response(null, { status: 200 })
		let resolveBodyReadStarted!: () => void
		const bodyReadStarted = new Promise<void>((resolve) => {
			resolveBodyReadStarted = resolve
		})
		vi.spyOn(response, 'json').mockImplementation(() => {
			return new Promise<never>((_, reject) => {
				controller.signal.addEventListener('abort', () => reject(cause), {
					once: true,
				})
				resolveBodyReadStarted()
			})
		})
		vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(response))

		const { fetchFinancialReport } = financialReportApi()
		const result = fetchFinancialReport(controller.signal)

		await bodyReadStarted
		controller.abort()

		await expect(result).rejects.toMatchObject({
			layer: 'http',
			type: 'abort',
			cause,
		})
	})
})
