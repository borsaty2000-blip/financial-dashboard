import { type FinancialReport } from "@client/modules/financial-report/types/financial-report";

export const fetchFinancialData = async (): Promise<FinancialReport> => {
	const rawResponse = await fetch("/api/financial-report");

	if (!rawResponse.ok) {
		throw new Error(`Failed to fetch financial report: ${rawResponse.status}`);
	}

	const response: FinancialReport = await rawResponse.json();
	return response;
};
