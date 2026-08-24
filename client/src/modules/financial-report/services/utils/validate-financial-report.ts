import { type FinancialReportNode } from '@client/modules/financial-report/types/financial-node'
import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'

const validatePeriods = (periods: string[]): void => {
	const uniquePeriods = new Set<string>()

	for (const period of periods) {
		const date = new Date(`${period}T00:00:00Z`)

		if (
			Number.isNaN(date.valueOf()) ||
			date.toISOString().slice(0, 10) !== period
		) {
			throw new Error(
				`Financial report period "${period}" is invalid`
			)
		}

		if (uniquePeriods.has(period)) {
			throw new Error(
				`Financial report period "${period}" is duplicated`
			)
		}

		uniquePeriods.add(period)
	}
}

const validateNode = (
	node: FinancialReportNode,
	periodsCount: number,
	seenIds: Set<string>,
): void => {
	const renderedId = String(node.id)

	if (seenIds.has(renderedId)) {
		throw new Error(
			`Financial report node ID "${renderedId}" is duplicated`
		)
	}

	seenIds.add(renderedId)

	if (node.values.length !== periodsCount) {
		throw new Error(
			`Financial report node "${renderedId}" has ${node.values.length} values for ${periodsCount} periods`
		)
	}

	for (const child of node.children) {
		validateNode(child, periodsCount, seenIds)
	}

	if (node.children.length === 0) {
		return
	}

	for (let periodIndex = 0; periodIndex < periodsCount; periodIndex += 1) {
		const childrenTotal = node.children.reduce(
			(total, child) => total + child.values[periodIndex]!,
			0,
		)

		if (node.values[periodIndex] !== childrenTotal) {
			throw new Error(
				`Financial report node "${renderedId}" total does not equal the sum of its direct children for period index ${periodIndex}`
			)
		}
	}
}

const validateChannelTotals = (report: FinancialReport): void => {
	for (
		let periodIndex = 0;
		periodIndex < report.periods.length;
		periodIndex += 1
	) {
		let channelsTotal = 0

		for (const branch of report.company.children) {
			for (const employee of branch.children) {
				for (const channel of employee.children) {
					channelsTotal += channel.values[periodIndex]!
				}
			}
		}

		if (report.company.values[periodIndex] !== channelsTotal) {
			throw new Error(
				`Financial report company total does not equal the sum of all channel leaves for period index ${periodIndex}`,
			)
		}
	}
}

export const validateFinancialReport = (
	report: FinancialReport,
): FinancialReport => {
	validatePeriods(report.periods)
	validateNode(report.company, report.periods.length, new Set<string>())
	validateChannelTotals(report)

	return report
}
