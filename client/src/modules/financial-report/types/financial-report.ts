export type FinancialChannelName =
	"Existing clients" | "New organic" | "New paid";

interface FinancialNodeBase {
	id: string;
	name: string;
	values: number[];
}

export interface FinancialChannel extends FinancialNodeBase {
	name: FinancialChannelName;
	children: [];
}

export interface FinancialEmployee extends FinancialNodeBase {
	imageUrl: string;
	children: FinancialChannel[];
}

export interface FinancialBranch extends FinancialNodeBase {
	children: FinancialEmployee[];
}

export interface FinancialCompany extends FinancialNodeBase {
	children: FinancialBranch[];
}

export interface FinancialReport {
	periods: string[];
	company: FinancialCompany;
}
