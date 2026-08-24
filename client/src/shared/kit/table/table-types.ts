export interface TableColumn {
	key: string;
	label: string;
}

export interface TableNode<TValue = number> {
	id: string;
	name: string;
	imageUrl?: string;
	values: TValue[];
	children: TableNode<TValue>[];
}

export interface TableRow<TValue = number> extends Omit<
	TableNode<TValue>,
	"children"
> {
	depth: number;
	hasChildren: boolean;
	ancestorIds: string[];
}
