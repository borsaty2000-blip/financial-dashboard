import { useFinancialReport } from '@client/modules/financial-report/ui/hooks/use-financial-report'
import { FinancialBarChart } from '@client/modules/financial-report/ui/FinancialBarChart'
import { FinancialTable } from '@client/modules/financial-report/ui/FinancialTable'

function FinancialChartSkeleton() {
	return (
		<div
			aria-hidden="true"
			className="h-107.5 w-full rounded-lg bg-white px-2 py-4 sm:px-4 sm:py-6"
		>
			<div className="bg-ink-subtle motion-reduce:animate-none h-full w-full animate-pulse rounded" />
		</div>
	)
}

export default function FinancialReportSection() {
	const reportState = useFinancialReport()

	return (
		<section
			aria-labelledby="financial-report-title"
			aria-busy={reportState.status === 'loading'}
			className="flex flex-col gap-4 py-6"
		>
			<h1
				id="financial-report-title"
				className="font-heading text-3xl font-normal leading-tight sm:text-4xl"
			>
				Clients
			</h1>

			{reportState.status === 'loading' && (
				<p role="status" className="sr-only">
					Loading financial report...
				</p>
			)}

			{reportState.status === 'error' ? (
				<div className="flex items-center gap-4">
					<p role="alert">Failed to load financial report</p>
					<button
						type="button"
						onClick={reportState.reload}
						className="focus-ring cursor-pointer rounded px-2 py-1"
					>
						Try again
					</button>
				</div>
			) : reportState.status === 'success' ? (
				<>
					<FinancialBarChart {...reportState.data.financialChart} />
					<FinancialTable data={reportState.data.financialTableData} />
				</>
			) : (
				<FinancialChartSkeleton />
			)}
		</section>
	)
}
