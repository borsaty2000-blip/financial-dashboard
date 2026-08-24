import { financialReportApi } from '@client/modules/financial-report/services/financial-report-api'

import { withRetry } from '@client/shared/service-utils/retry-policy/with-retry'

import { mapFinancialReportDto } from '@client/modules/financial-report/services/utils/map-financial-report-dto'
import { validateFinancialReport } from '@client/modules/financial-report/services/utils/validate-financial-report'

import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'
import { FinancialReportSchema } from '@client/modules/financial-report/services/utils/financial-report.schema'
import { shouldRetryHttpError } from '@client/shared/service-utils/retry-policy/should-retry-http-error'
import { createApiError } from '@client/shared/errors/api-error'

export const financialReportApiAdapter = () => {
	const { fetchFinancialReport } = financialReportApi()

	const getFinancialReport = async (
		externalSignal?: AbortSignal,
	): Promise<FinancialReport> => {
		const rawResponse = await withRetry(fetchFinancialReport, {
			attempts: 3,
			timeoutMs: 5000,
			shouldRetry: shouldRetryHttpError,
			externalSignal,
		})

		try {
			const dto = FinancialReportSchema.parse(rawResponse)
			const report = mapFinancialReportDto(dto)

			return validateFinancialReport(report)
		} catch (cause) {
			throw createApiError(
				'invalid-response',
				'Financial report API response failed validation',
				{ cause },
			)
		}
	}

	return {
		getFinancialReport,
	}
}
