import {
	type FinancialChannelName,
	type FinancialReport,
} from "@client/modules/financial-report/types/financial-report";

export interface FinancialChartDataPoint {
	period: string;
	existingClients: number;
	newOrganic: number;
	newPaid: number;
}

const channelDataKeys: Record<
	FinancialChannelName,
	keyof Omit<FinancialChartDataPoint, "period">
> = {
	"Existing clients": "existingClients",
	"New organic": "newOrganic",
	"New paid": "newPaid",
};

export function createFinancialChartData(
	report: FinancialReport,
): FinancialChartDataPoint[] {
	const chartData = report.periods.map((period) => ({
		period,
		existingClients: 0,
		newOrganic: 0,
		newPaid: 0,
	}));

	for (const branch of report.company.children) {
		for (const employee of branch.children) {
			for (const channel of employee.children) {
				const dataKey = channelDataKeys[channel.name];

				channel.values.forEach((value, periodIndex) => {
					const dataPoint = chartData[periodIndex];

					if (dataPoint) {
						dataPoint[dataKey] += value;
					}
				});
			}
		}
	}

	return chartData;
}
