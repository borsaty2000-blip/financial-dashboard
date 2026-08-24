import { describe, expect, it } from 'vitest'
import { type FinancialReportDto } from '@client/modules/financial-report/services/utils/financial-report.schema'
import { mapFinancialReportDto } from './map-financial-report-dto'

describe('mapFinancialReportDto', () => {
	it('maps the complete DTO tree to a new financial report tree', () => {
		const dto: FinancialReportDto = {
			periods: ['2024-02-01'],
			company: {
				id: 1,
				name: 'Company',
				values: [10],
				children: [
					{
						id: 'branch-1',
						name: 'Branch 1',
						values: [10],
						children: [
							{
								id: 'employee-1',
								name: 'Anna Blackwood',
								values: [10],
								imageUrl: '/api/avatars/anna-blackwood.png',
								children: [
									{
										id: 'channel-1',
										name: 'Existing clients',
										values: [10],
										children: [],
									},
								],
							},
						],
					},
				],
			},
		}

		const report = mapFinancialReportDto(dto)

		expect(report).toEqual(dto)
		expect(report).not.toBe(dto)
		expect(report.periods).toBe(dto.periods)
		expect(report.company).not.toBe(dto.company)
		expect(report.company.values).toBe(dto.company.values)
		expect(report.company.children[0]).not.toBe(dto.company.children[0])
		expect(report.company.children[0]?.values).toBe(
			dto.company.children[0]?.values,
		)
		expect(report.company.children[0]?.children[0]).not.toBe(
			dto.company.children[0]?.children[0],
		)
		expect(report.company.children[0]?.children[0]?.values).toBe(
			dto.company.children[0]?.children[0]?.values,
		)
		expect(report.company.children[0]?.children[0]?.children[0]).not.toBe(
			dto.company.children[0]?.children[0]?.children[0],
		)
		expect(report.company.children[0]?.children[0]?.children[0]?.values).toBe(
			dto.company.children[0]?.children[0]?.children[0]?.values,
		)
		expect(report.company.children[0]?.children[0]?.children[0]?.children).toBe(
			dto.company.children[0]?.children[0]?.children[0]?.children,
		)
	})
})
