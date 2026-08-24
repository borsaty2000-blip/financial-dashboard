import { type TableColumn } from "@client/shared/kit/table/table-types";

interface TableHeaderProps {
	columns: readonly TableColumn[];
}

export default function TableHeader({ columns }: TableHeaderProps) {
	return (
		<thead>
			<tr>
				<th
					scope="col"
					className="w-auto py-3 pr-1 pl-2 sm:w-66 sm:pr-3 sm:pl-6"
				>
					<span className="sr-only">Entity</span>
				</th>
				{columns.map((column) => (
					<th
						key={column.key}
						scope="col"
						className="text-data text-ink-muted whitespace-nowrap px-2 py-3 text-right font-normal last:pr-6 sm:px-3"
					>
						{column.label}
					</th>
				))}
			</tr>
		</thead>
	);
}
