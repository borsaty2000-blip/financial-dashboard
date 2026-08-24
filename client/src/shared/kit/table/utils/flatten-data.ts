import {
	type TableNode,
	type TableRow,
} from "@client/shared/kit/table/table-types";

export function flattenData<TValue>(
	root: TableNode<TValue>,
): TableRow<TValue>[] {
	const rows: TableRow<TValue>[] = [];
	const stack: Array<{
		node: TableNode<TValue>;
		depth: number;
		ancestorIds: string[];
	}> = [
		{
			node: root,
			depth: 0,
			ancestorIds: [],
		},
	];

	while (stack.length > 0) {
		const { node, depth, ancestorIds } = stack.pop()!;

		rows.push({
			id: node.id,
			name: node.name,
			imageUrl: node.imageUrl,
			values: node.values,
			depth,
			hasChildren: node.children.length > 0,
			ancestorIds,
		});

		for (let index = node.children.length - 1; index >= 0; index -= 1) {
			const child = node.children[index];

			stack.push({
				node: child,
				depth: depth + 1,
				ancestorIds: [...ancestorIds, node.id],
			});
		}
	}

	return rows;
}
