import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FinancialBarChart } from "./FinancialBarChart";

describe("FinancialBarChart", () => {
	it("provides an accessible name, description, and focus styling", () => {
		render(<FinancialBarChart data={[]} />);

		const chart = screen.getByRole("figure", {
			name: "Financial report bar chart",
		});

		expect(chart).toHaveClass("chart-focus-ring");
		expect(chart).toHaveTextContent(
			"Monthly stacked bar chart showing existing clients, new organic clients, and new paid clients.",
		);
	});
});
