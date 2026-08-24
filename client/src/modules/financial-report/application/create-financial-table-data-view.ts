import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'
import { type FinancialTableData } from '@client/modules/financial-report/application/types/financial-table'
import { formatPeriod } from '@client/modules/financial-report/application/utils/format-period'
import { flattenFinancialReportData } from '@client/modules/financial-report/application/utils/flatten-financial-report-data'
import { createApplicationError } from '@client/shared/errors/application-error'

export const createFinancialTableDataView = (
	report: FinancialReport,
): FinancialTableData => {
	const rows = flattenFinancialReportData(report.company)

	const columns = report.periods.map((period) => ({
		key: period,
		label: formatPeriod(period),
	}))
	const inconsistentRow = rows.find(
		(row) => row.values.length !== columns.length,
	)

	if (inconsistentRow) {
		throw createApplicationError(
			'inconsistent-data',
			'Financial table data is inconsistent: the number of row values does not match the number of columns',
			{
				meta: {
					rowId: inconsistentRow.id,
					rowName: inconsistentRow.name,
					columnsCount: columns.length,
					valuesCount: inconsistentRow.values.length,
				},
			},
		)
	}

	return {
		rows,
		columns,
	}
}
