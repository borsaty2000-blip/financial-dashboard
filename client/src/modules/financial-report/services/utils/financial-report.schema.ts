import { object, string, number, array, union, tuple, type output } from 'zod'

const FinancialNodeBaseSchema = object({
	id: union([string(), number()]),
	name: string().trim().min(1),
	values: union([array(number())]),
})

const FinancialChannelSchema = FinancialNodeBaseSchema.extend({
	children: tuple([]),
})

const FinancialEmployeeSchema = FinancialNodeBaseSchema.extend({
	children: array(FinancialChannelSchema),
	imageUrl: string(),
})

const FinancialBranchSchema = FinancialNodeBaseSchema.extend({
	children: array(FinancialEmployeeSchema),
})

const FinancialCompanySchema = FinancialNodeBaseSchema.extend({
	children: array(FinancialBranchSchema),
})

export const FinancialReportSchema = object({
	periods: array(string()),
	company: FinancialCompanySchema,
})

export type FinancialReportDto = output<typeof FinancialReportSchema>
export type FinancialCompanyDto = FinancialReportDto['company']
export type FinancialBranchDto = FinancialCompanyDto['children'][number]
export type FinancialEmployeeDto = FinancialBranchDto['children'][number]
export type FinancialChannelDto = FinancialEmployeeDto['children'][number]
