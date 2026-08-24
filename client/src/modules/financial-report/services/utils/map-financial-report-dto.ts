import {
	type FinancialBranchDto,
	type FinancialChannelDto,
	type FinancialCompanyDto,
	type FinancialEmployeeDto,
	type FinancialReportDto,
} from '@client/modules/financial-report/services/utils/financial-report.schema'
import {
	type FinancialBranch,
	type FinancialChannel,
	type FinancialCompany,
	type FinancialEmployee,
} from '@client/modules/financial-report/types/financial-node'
import { type FinancialReport } from '@client/modules/financial-report/types/financial-report'

const mapFinancialChannelDto = (dto: FinancialChannelDto): FinancialChannel => {
	return {
		id: dto.id,
		name: dto.name,
		values: dto.values,
		children: dto.children,
	}
}

const mapFinancialEmployeeDto = (
	dto: FinancialEmployeeDto,
): FinancialEmployee => {
	return {
		id: dto.id,
		name: dto.name,
		values: dto.values,
		imageUrl: dto.imageUrl,
		children: dto.children.map((channelDto) =>
			mapFinancialChannelDto(channelDto),
		),
	}
}

const mapFinancialBranchDto = (dto: FinancialBranchDto): FinancialBranch => {
	return {
		id: dto.id,
		name: dto.name,
		values: dto.values,
		children: dto.children.map((employeeDto) =>
			mapFinancialEmployeeDto(employeeDto),
		),
	}
}

const mapFinancialCompanyDto = (dto: FinancialCompanyDto): FinancialCompany => {
	return {
		id: dto.id,
		name: dto.name,
		values: dto.values,
		children: dto.children.map((branchDto) => mapFinancialBranchDto(branchDto)),
	}
}

export const mapFinancialReportDto = (
	dto: FinancialReportDto,
): FinancialReport => {
	return {
		periods: dto.periods,
		company: mapFinancialCompanyDto(dto.company),
	}
}
