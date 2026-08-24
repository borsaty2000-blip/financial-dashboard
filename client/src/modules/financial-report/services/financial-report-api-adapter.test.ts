import { afterEach, describe, expect, it, vi } from 'vitest'
import { financialReportApiAdapter } from '@client/modules/financial-report/services/financial-report-api-adapter'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('financialReportApiAdapter', () => {
	it('validates and maps a valid API response', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response(JSON.stringify(financialReportFixture), { status: 200 }),
			)
		vi.stubGlobal('fetch', fetchMock)

		const { getFinancialReport } = financialReportApiAdapter()

		await expect(getFinancialReport()).resolves.toEqual(financialReportFixture)
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('wraps schema validation failures as API errors without retrying', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response(JSON.stringify({ periods: [] }), { status: 200 }),
			)
		vi.stubGlobal('fetch', fetchMock)

		const { getFinancialReport } = financialReportApiAdapter()

		await expect(getFinancialReport()).rejects.toMatchObject({
			layer: 'api',
			type: 'invalid-response',
			cause: expect.objectContaining({ name: 'ZodError' }),
		})
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('wraps channel-total validation failures as API errors without retrying', async () => {
		const inconsistentReport = structuredClone(financialReportFixture)
		inconsistentReport.company.children[0]!.children[0]!.children = []
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockResolvedValue(
				new Response(JSON.stringify(inconsistentReport), { status: 200 }),
			)
		vi.stubGlobal('fetch', fetchMock)

		const { getFinancialReport } = financialReportApiAdapter()

		await expect(getFinancialReport()).rejects.toMatchObject({
			layer: 'api',
			type: 'invalid-response',
			cause: expect.objectContaining({
				message:
					'Financial report company total does not equal the sum of all channel leaves for period index 0',
			}),
		})
		expect(fetchMock).toHaveBeenCalledOnce()
	})

	it('retries a transient transport failure before validating the response', async () => {
		const fetchMock = vi
			.fn<typeof fetch>()
			.mockRejectedValueOnce(new TypeError('Network unavailable'))
			.mockResolvedValueOnce(
				new Response(JSON.stringify(financialReportFixture), { status: 200 }),
			)
		vi.stubGlobal('fetch', fetchMock)

		const { getFinancialReport } = financialReportApiAdapter()

		await expect(getFinancialReport()).resolves.toEqual(financialReportFixture)
		expect(fetchMock).toHaveBeenCalledTimes(2)
	})

	it('propagates external cancellation through the complete request chain', async () => {
		const fetchMock = vi.fn<typeof fetch>((_input, init) => {
			return new Promise<never>((_, reject) => {
				init?.signal?.addEventListener(
					'abort',
					() => reject(new DOMException('Request aborted', 'AbortError')),
					{ once: true },
				)
			})
		})
		vi.stubGlobal('fetch', fetchMock)
		const controller = new AbortController()
		const { getFinancialReport } = financialReportApiAdapter()

		const result = getFinancialReport(controller.signal)
		controller.abort()

		await expect(result).rejects.toMatchObject({
			layer: 'http',
			type: 'abort',
		})
		expect(fetchMock).toHaveBeenCalledOnce()
	})
})
