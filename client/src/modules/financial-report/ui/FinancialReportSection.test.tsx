import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type FinancialChartDataPoint } from "@client/modules/financial-report/application/create-financial-chart-data";
import { type FinancialReport } from "@client/modules/financial-report/types/financial-report";
import { financialReportFixture } from "@client/test/fixtures/financial-report";
import FinancialReportSection from "./FinancialReportSection";

vi.mock("@client/modules/financial-report/ui/FinancialBarChart", () => ({
	FinancialBarChart: ({ data }: { data: FinancialChartDataPoint[] }) => (
		<div data-testid="financial-chart">{data.length} data points</div>
	),
}));

vi.mock("@client/modules/financial-report/ui/FinancialTable", () => ({
	FinancialTable: ({ report }: { report: FinancialReport }) => (
		<div data-testid="financial-table">{report.company.name}</div>
	),
}));

afterEach(() => {
	vi.unstubAllGlobals();
});

describe("FinancialReportSection", () => {
	it("renders a loading state while the report is loading", () => {
		vi.stubGlobal(
			"fetch",
			vi.fn(() => new Promise<Response>(() => undefined)),
		);

		render(<FinancialReportSection />);

		expect(screen.getByRole("region", { name: "Clients" })).toHaveAttribute(
			"aria-busy",
			"true",
		);
		expect(screen.getByRole("status")).toHaveTextContent(
			"Loading financial report...",
		);
		expect(screen.getByTestId("financial-chart")).toHaveTextContent(
			"0 data points",
		);
		expect(screen.queryByTestId("financial-table")).not.toBeInTheDocument();
	});

	it("renders the report after a successful response", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				status: 200,
				json: async () => financialReportFixture,
			}),
		);

		render(<FinancialReportSection />);

		expect(await screen.findByTestId("financial-table")).toHaveTextContent(
			"Company",
		);
		expect(screen.getByTestId("financial-chart")).toHaveTextContent(
			"1 data points",
		);
		expect(screen.getByRole("region", { name: "Clients" })).toHaveAttribute(
			"aria-busy",
			"false",
		);
		expect(screen.queryByRole("status")).not.toBeInTheDocument();
	});

	it("renders an error state when the request fails", async () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => undefined);

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				status: 500,
			}),
		);

		render(<FinancialReportSection />);

		expect(await screen.findByRole("alert")).toHaveTextContent(
			"Failed to load financial report",
		);
		expect(screen.queryByTestId("financial-chart")).not.toBeInTheDocument();
		expect(screen.queryByTestId("financial-table")).not.toBeInTheDocument();

		consoleError.mockRestore();
	});
});
