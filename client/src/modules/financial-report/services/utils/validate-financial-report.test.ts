import { describe, expect, it } from 'vitest'
import { validateFinancialReport } from '@client/modules/financial-report/services/utils/validate-financial-report'
import { type FinancialReportNode } from '@client/modules/financial-report/types/financial-node'
import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

const cloneReport = (): FinancialReport => {
	return structuredClone(financialReportFixture)
}

const addPeriodToEveryNode = (node: FinancialReportNode): void => {
	node.values.push(node.values[0]!)

	for (const child of node.children) {
		addPeriodToEveryNode(child)
	}
}

describe('validateFinancialReport', () => {
	it('accepts a report that satisfies the semantic contract', () => {
		const report = cloneReport()

		expect(validateFinancialReport(report)).toBe(report)
	})

	it('rejects a period that cannot be formatted as a date', () => {
		const report = cloneReport()
		report.periods[0] = 'not-a-date'

		expect(() => validateFinancialReport(report)).toThrow(
			'Financial report period "not-a-date" is invalid',
		)
	})

	it('rejects a calendar date normalized by Date', () => {
		const report = cloneReport()
		report.periods[0] = '2024-02-30'

		expect(() => validateFinancialReport(report)).toThrow(
			'Financial report period "2024-02-30" is invalid',
		)
	})

	it('rejects duplicated periods', () => {
		const report = cloneReport()
		report.periods.push(report.periods[0]!)
		addPeriodToEveryNode(report.company)

		expect(() => validateFinancialReport(report)).toThrow(
			`Financial report period "${report.periods[0]}" is duplicated`,
		)
	})

	it('rejects globally duplicated node IDs after React key stringification', () => {
		const report = cloneReport()
		report.company.id = 1
		report.company.children[0]!.children[0]!.children[0]!.id = '1'

		expect(() => validateFinancialReport(report)).toThrow(
			'Financial report node ID "1" is duplicated',
		)
	})

	it('rejects a node whose values do not match the number of periods', () => {
		const report = cloneReport()
		const channel = report.company.children[0]!.children[0]!.children[0]!
		channel.values.push(1)

		expect(() => validateFinancialReport(report)).toThrow(
			`Financial report node "${channel.id}" has 2 values for 1 periods`,
		)
	})

	it('rejects a non-leaf total that differs from its direct children', () => {
		const report = cloneReport()
		const employee = report.company.children[0]!.children[0]!
		employee.values[0] = 14

		expect(() => validateFinancialReport(report)).toThrow(
			`Financial report node "${employee.id}" total does not equal the sum of its direct children for period index 0`,
		)
	})

	it('rejects a company total that is not represented by channel leaves', () => {
		const report = cloneReport()
		const employee = report.company.children[0]!.children[0]!
		employee.children = []

		expect(() => validateFinancialReport(report)).toThrow(
			'Financial report company total does not equal the sum of all channel leaves for period index 0',
		)
	})

	it('allows a zero-valued non-channel node without children', () => {
		const report = cloneReport()
		const branch = report.company.children[0]!
		const employee = branch.children[0]!
		employee.children = []
		employee.values[0] = 0
		branch.values[0] = 0
		report.company.values[0] = 27

		expect(validateFinancialReport(report)).toBe(report)
	})
})
