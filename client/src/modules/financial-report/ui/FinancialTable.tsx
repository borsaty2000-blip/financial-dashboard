import { useMemo, useState } from "react";
import { type FinancialReport } from "@client/modules/financial-report/types/financial-report";
import { formatPeriod } from "@client/modules/financial-report/utils/format-period";
import { flattenData } from "@client/shared/kit/table/utils/flatten-data";
import Table from "@client/shared/kit/table/ui/Table";
import TableBody from "@client/shared/kit/table/ui/TableBody";
import TableHeader from "@client/shared/kit/table/ui/TableHeader";

interface FinancialTableProps {
	report: FinancialReport;
}

export function FinancialTable({ report }: FinancialTableProps) {
	const rows = useMemo(() => flattenData(report.company), [report.company]);

	const columns = report.periods.map((period) => ({
		key: period,
		label: formatPeriod(period),
	}));

	const [expandedIds, setExpandedIds] = useState<Set<string>>(
		() => new Set([report.company.id]),
	);

	const visibleRows = useMemo(
		() =>
			rows.filter((row) =>
				row.ancestorIds.every((ancestorId) => expandedIds.has(ancestorId)),
			),
		[rows, expandedIds],
	);

	function handleToggle(id: string) {
		setExpandedIds((currentIds) => {
			const nextIds = new Set(currentIds);

			if (nextIds.has(id)) {
				nextIds.delete(id);
			} else {
				nextIds.add(id);
			}

			return nextIds;
		});
	}

	return (
		<Table caption="Financial report by month">
			<TableHeader columns={columns} />
			<TableBody
				rows={visibleRows}
				columns={columns}
				expandedIds={expandedIds}
				onToggle={handleToggle}
			/>
		</Table>
	);
}
