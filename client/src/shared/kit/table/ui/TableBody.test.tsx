import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { type TableRow } from "@client/shared/kit/table/table-types";
import TableBody from "./TableBody";

const columns = [{ key: "feb-2024", label: "Feb 2024" }];

const expandableRow: TableRow<number> = {
	id: "employee-1",
	name: "Anna Blackwood",
	imageUrl: "/api/avatars/anna-blackwood.png",
	values: [25],
	depth: 2,
	hasChildren: true,
	ancestorIds: ["company", "branch-1"],
};

interface RenderTableBodyOptions {
	row?: TableRow<number>;
	columnCount?: number;
	expandedIds?: ReadonlySet<string>;
}

function renderTableBody({
	row = expandableRow,
	columnCount = columns.length,
	expandedIds = new Set(),
}: RenderTableBodyOptions = {}) {
	const onToggle = vi.fn();

	render(
		<table>
			<TableBody
				rows={[row]}
				columns={columns.slice(0, columnCount)}
				expandedIds={expandedIds}
				onToggle={onToggle}
			/>
		</table>,
	);

	return {
		onToggle,
		row: screen.getByRole("row", { name: new RegExp(row.name, "i") }),
	};
}

describe("TableBody", () => {
	it("renders a row and toggles an expandable row when clicked", async () => {
		const user = userEvent.setup();
		const { onToggle, row } = renderTableBody();

		expect(screen.getByRole("cell", { name: "25" })).toBeInTheDocument();
		expect(row.querySelector("img")).toHaveAttribute(
			"src",
			"/api/avatars/anna-blackwood.png",
		);

		await user.click(row);

		expect(onToggle).toHaveBeenCalledOnce();
		expect(onToggle).toHaveBeenCalledWith("employee-1");
	});

	it("does not call onToggle for a leaf row", async () => {
		const user = userEvent.setup();
		const { onToggle, row } = renderTableBody({
			row: { ...expandableRow, imageUrl: undefined, hasChildren: false },
		});

		await user.click(row);

		expect(onToggle).not.toHaveBeenCalled();
		expect(row).not.toHaveAttribute("tabindex");
		expect(row.querySelector("img")).not.toBeInTheDocument();
	});

	it("allows an expandable row to be toggled with the keyboard", async () => {
		const user = userEvent.setup();
		const { onToggle, row } = renderTableBody();

		await user.tab();

		expect(row).toHaveFocus();

		await user.keyboard("{Enter}");
		await user.keyboard(" ");

		expect(onToggle).toHaveBeenNthCalledWith(1, "employee-1");
		expect(onToggle).toHaveBeenNthCalledWith(2, "employee-1");
	});

	it("ignores keyboard keys that do not toggle a row", async () => {
		const user = userEvent.setup();
		const { onToggle, row } = renderTableBody();

		await user.tab();

		expect(row).toHaveFocus();

		await user.keyboard("{ArrowDown}");

		expect(onToggle).not.toHaveBeenCalled();
	});

	it("renders the expanded state", () => {
		const { row } = renderTableBody({
			expandedIds: new Set([expandableRow.id]),
		});

		expect(row).toHaveAttribute("aria-expanded", "true");
	});

	it("renders only as many values as there are columns", () => {
		renderTableBody({
			row: { ...expandableRow, values: [25, 26] },
			columnCount: 1,
		});

		expect(screen.getByRole("cell", { name: "25" })).toBeInTheDocument();
		expect(screen.queryByRole("cell", { name: "26" })).not.toBeInTheDocument();
	});
});
