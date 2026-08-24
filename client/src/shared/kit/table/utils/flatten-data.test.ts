import { describe, expect, it } from "vitest";
import { type TableNode } from "@client/shared/kit/table/table-types";
import { flattenData } from "./flatten-data";

const input: TableNode<number> = {
	id: "company",
	name: "Company",
	values: [40],
	children: [
		{
			id: "branch-1",
			name: "Branch 1",
			values: [13],
			children: [
				{
					id: "employee",
					name: "Anna Blackwood",
					imageUrl: "/api/avatars/anna-blackwood.png",
					values: [13],
					children: [
						{
							id: "channel",
							name: "Existing clients",
							values: [10],
							children: [],
						},
					],
				},
			],
		},
		{
			id: "branch-2",
			name: "Branch 2",
			values: [27],
			children: [],
		},
	],
};

describe("flattenData", () => {
	it("flattens nodes in preorder", () => {
		expect(flattenData(input).map((row) => row.id)).toEqual([
			"company",
			"branch-1",
			"employee",
			"channel",
			"branch-2",
		]);
	});

	it("assigns the correct depth and ancestor ids", () => {
		expect(
			flattenData(input).map(({ id, depth, ancestorIds }) => ({
				id,
				depth,
				ancestorIds,
			})),
		).toEqual([
			{
				id: "company",
				depth: 0,
				ancestorIds: [],
			},
			{ id: "branch-1", depth: 1, ancestorIds: ["company"] },
			{
				id: "employee",
				depth: 2,
				ancestorIds: ["company", "branch-1"],
			},
			{
				id: "channel",
				depth: 3,
				ancestorIds: ["company", "branch-1", "employee"],
			},
			{ id: "branch-2", depth: 1, ancestorIds: ["company"] },
		]);
	});

	it("marks only nodes with children as expandable", () => {
		expect(
			flattenData(input).map(({ id, hasChildren }) => ({ id, hasChildren })),
		).toEqual([
			{ id: "company", hasChildren: true },
			{ id: "branch-1", hasChildren: true },
			{ id: "employee", hasChildren: true },
			{ id: "channel", hasChildren: false },
			{ id: "branch-2", hasChildren: false },
		]);
	});
});
