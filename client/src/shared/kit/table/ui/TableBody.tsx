import { type CSSProperties, type ReactNode } from "react";
import {
	type TableColumn,
	type TableRow,
} from "@client/shared/kit/table/table-types";

interface TableBodyProps<TValue extends ReactNode> {
	rows: readonly TableRow<TValue>[];
	columns: readonly TableColumn[];
	expandedIds: ReadonlySet<string>;
	onToggle: (id: string) => void;
}

export default function TableBody<TValue extends ReactNode>({
	rows,
	columns,
	expandedIds,
	onToggle,
}: TableBodyProps<TValue>) {
	return (
		<tbody>
			{rows.map((row) => {
				const isExpanded = expandedIds.has(row.id);

				return (
					<tr
						key={row.id}
						onClick={row.hasChildren ? () => onToggle(row.id) : undefined}
						onKeyDown={
							row.hasChildren
								? (event) => {
										if (event.key === "Enter" || event.key === " ") {
											event.preventDefault();
											onToggle(row.id);
										}
									}
								: undefined
						}
						tabIndex={row.hasChildren ? 0 : undefined}
						aria-expanded={row.hasChildren ? isExpanded : undefined}
						className={`focus-ring border-ink-subtle hover:bg-ink-subtle border-t ${
							row.hasChildren ? "cursor-pointer" : ""
						}`}
					>
						<th
							scope="row"
							className="text-data w-auto whitespace-nowrap py-4.5 pr-1 pl-(--row-padding-mobile) text-left font-normal sm:w-66 sm:pr-6 sm:pl-[var(--row-padding-desktop)]"
							style={
								{
									"--row-padding-mobile": `${8 + row.depth * 16}px`,
									"--row-padding-desktop": `${16 + row.depth * 28}px`,
								} as CSSProperties
							}
						>
							<span className="inline-flex items-center gap-1 sm:gap-2">
								{row.hasChildren && (
									<span
										aria-hidden="true"
										className={`transition-transform ${
											isExpanded ? "rotate-90" : ""
										}`}
									>
										{"\u203A"}
									</span>
								)}
								{row.imageUrl && (
									<img
										src={row.imageUrl}
										alt=""
										width={20}
										height={20}
										loading="lazy"
										decoding="async"
										className="size-5 shrink-0 rounded-full object-cover"
									/>
								)}
								{row.name}
							</span>
						</th>
						{row.values.slice(0, columns.length).map((value, columnIndex) => {
							const column = columns[columnIndex];

							return (
								<td
									key={column.key}
									className="text-data px-2 py-3 text-right last:pr-6 sm:px-3"
								>
									{value}
								</td>
							);
						})}
					</tr>
				);
			})}
		</tbody>
	);
}
