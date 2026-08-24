import { describe, expect, it } from 'vitest'
import { FinancialReportSchema } from '@client/modules/financial-report/services/utils/financial-report.schema'
import { financialReportFixture } from '@client/test/fixtures/financial-report'

describe('FinancialReportSchema', () => {
	it('accepts the complete financial report contract', () => {
		expect(
			FinancialReportSchema.safeParse(financialReportFixture).success,
		).toBe(true)
	})

	it('trims surrounding whitespace from node names', () => {
		const payload = structuredClone(financialReportFixture)
		const channel = payload.company.children[0]!.children[0]!.children[0]!
		channel.name = `  ${channel.name}  `

		const report = FinancialReportSchema.parse(payload)

		expect(report.company.children[0]!.children[0]!.children[0]!.name).toBe(
			'Existing clients',
		)
	})

	it.each([
		['empty', ''],
		['whitespace-only', '   '],
	])('rejects an %s node name', (_description, name) => {
		const payload = structuredClone(financialReportFixture)
		payload.company.name = name

		expect(FinancialReportSchema.safeParse(payload).success).toBe(false)
	})

	it('rejects an employee without the required image URL', () => {
		const branch = financialReportFixture.company.children[0]!
		const employee = branch.children[0]!
		const payload = {
			...financialReportFixture,
			company: {
				...financialReportFixture.company,
				children: [
					{
						...branch,
						children: [
							{
								id: employee.id,
								name: employee.name,
								values: employee.values,
								children: employee.children,
							},
						],
					},
				],
			},
		}

		expect(FinancialReportSchema.safeParse(payload).success).toBe(false)
	})

	it('rejects non-numeric financial values', () => {
		const branch = financialReportFixture.company.children[0]!
		const employee = branch.children[0]!
		const channel = employee.children[0]!
		const payload = {
			...financialReportFixture,
			company: {
				...financialReportFixture.company,
				children: [
					{
						...branch,
						children: [
							{
								...employee,
								children: [{ ...channel, values: ['10'] }],
							},
						],
					},
				],
			},
		}

		expect(FinancialReportSchema.safeParse(payload).success).toBe(false)
	})

	it('rejects children below a channel leaf', () => {
		const branch = financialReportFixture.company.children[0]!
		const employee = branch.children[0]!
		const channel = employee.children[0]!
		const payload = {
			...financialReportFixture,
			company: {
				...financialReportFixture.company,
				children: [
					{
						...branch,
						children: [
							{
								...employee,
								children: [{ ...channel, children: [{}] }],
							},
						],
					},
				],
			},
		}

		expect(FinancialReportSchema.safeParse(payload).success).toBe(false)
	})
})
