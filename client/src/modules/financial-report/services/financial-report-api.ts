import { createHttpError } from '@client/shared/errors/http-error'

export const financialReportApi = () => {
	const fetchFinancialReport = async (
		signal: AbortSignal,
	): Promise<unknown> => {
		let rawResponse: Response

		try {
			rawResponse = await fetch('/api/financial-report', { signal })
		} catch (cause) {
			if (cause instanceof DOMException && cause.name === 'AbortError') {
				throw createHttpError(
					'abort',
					'Financial report request was aborted',
					{ cause })
			}

			throw createHttpError(
				'network',
				'Failed to fetch financial report',
				{ cause })
		}

		if (!rawResponse.ok) {
			throw createHttpError(
				'bad-response',
				`Error response status ${rawResponse.status}: ${rawResponse.statusText}`,
				{
					meta: {
						status: rawResponse.status,
						statusText: rawResponse.statusText,
					},
				},
			)
		}

		try {
			return await rawResponse.json()
		} catch (cause) {
			if (
				signal.aborted ||
				(cause instanceof DOMException && cause.name === 'AbortError')
			) {
				throw createHttpError(
					'abort',
					'Financial report request was aborted',
					{ cause })
			}

			if (!(cause instanceof SyntaxError)) {
				throw createHttpError(
					'network',
					'Failed to read financial report response',
					{ cause },
				)
			}

			throw createHttpError(
				'invalid-json',
				'Financial report API returned invalid JSON',
				{ cause },
			)
		}
	}

	return {
		fetchFinancialReport,
	}
}
