import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { financialReportFixture } from "@client/test/fixtures/financial-report";
import { FinancialTable } from "./FinancialTable";

describe("FinancialTable", () => {
	it("shows and hides descendants when their parent row is toggled", async () => {
		const user = userEvent.setup();

		render(<FinancialTable report={financialReportFixture} />);

		expect(
			screen.getByRole("region", { name: "Financial report by month" }),
		).toHaveAttribute("tabindex", "0");
		expect(
			screen.getByRole("table", { name: "Financial report by month" }),
		).toBeInTheDocument();
		expect(screen.getByText("Branch 1")).toBeInTheDocument();
		expect(screen.getByText("Branch 2")).toBeInTheDocument();
		expect(screen.queryByText("Anna Blackwood")).not.toBeInTheDocument();

		const branchRow = screen.getByRole("row", { name: /branch 1/i });

		await user.click(branchRow);

		expect(screen.getByText("Anna Blackwood")).toBeInTheDocument();

		await user.click(branchRow);

		expect(screen.queryByText("Anna Blackwood")).not.toBeInTheDocument();
	});
});
