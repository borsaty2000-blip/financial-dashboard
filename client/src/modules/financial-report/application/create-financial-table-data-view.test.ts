import { describe, expect, it } from 'vitest'

import { createFinancialTableDataView } from '@client/modules/financial-report/application/create-financial-table-data-view'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

describe('createFinancialTableDataView', () => {
	it('rejects a row whose values do not match the configured columns', () => {
		const report = structuredClone(financialReportFixture)
		const channel = report.company.children[0]!.children[0]!.children[0]!
		channel.values = []

		expect(() => createFinancialTableDataView(report)).toThrow(
			'the number of row values does not match the number of columns',
		)
	})
})
