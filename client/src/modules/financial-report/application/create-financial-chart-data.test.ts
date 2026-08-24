import { describe, expect, it } from "vitest";
import { createFinancialChartData } from "./create-financial-chart-data";
import { type FinancialReport } from "@client/modules/financial-report/types/financial-report";
import { financialReportFixture } from "@client/test/fixtures/financial-report";

describe("createFinancialChartData", () => {
	it("aggregates channel values from all employees", () => {
		expect(createFinancialChartData(financialReportFixture)).toEqual([
			{
				period: "2024-02-01",
				existingClients: 35,
				newOrganic: 3,
				newPaid: 2,
			},
		]);
	});

	it("ignores channel values that have no matching period", () => {
		const report: FinancialReport = {
			...financialReportFixture,
			periods: [],
		};

		expect(createFinancialChartData(report)).toEqual([]);
	});
});
