import useFinancialReport from "@client/modules/financial-report/application/use-financial-report";
import { FinancialBarChart } from "@client/modules/financial-report/ui/FinancialBarChart";
import { FinancialTable } from "@client/modules/financial-report/ui/FinancialTable";

export default function FinancialReportSection() {
	const { report, chartData, reportState } = useFinancialReport();

	return (
		<section
			aria-labelledby="financial-report-title"
			aria-busy={reportState === "loading"}
			className="flex flex-col gap-4 py-6"
		>
			<h1
				id="financial-report-title"
				className="font-heading text-3xl font-normal leading-tight sm:text-4xl"
			>
				Clients
			</h1>

			{reportState === "loading" && (
				<p role="status" className="sr-only">
					Loading financial report...
				</p>
			)}

			{reportState === "error" ? (
				<p role="alert">Failed to load financial report</p>
			) : (
				<>
					<FinancialBarChart data={chartData} />
					{report && <FinancialTable report={report} />}
				</>
			)}
		</section>
	);
}
