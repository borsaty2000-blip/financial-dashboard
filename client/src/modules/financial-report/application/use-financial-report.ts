import { useEffect, useState } from "react";
import { createFinancialChartData } from "@client/modules/financial-report/application/create-financial-chart-data";
import { fetchFinancialData } from "@client/modules/financial-report/services/fetch-financial-report";
import { type FinancialReport } from "@client/modules/financial-report/types/financial-report";

type ReportState = "loading" | "success" | "error";

export default function useFinancialReport() {
	const [report, setReport] = useState<FinancialReport | undefined>(undefined);
	const [reportState, setReportState] = useState<ReportState>("loading");

	useEffect(() => {
		async function loadData() {
			try {
				const data = await fetchFinancialData();
				setReport(data);
				setReportState("success");
			} catch (error) {
				console.error("Failed to load financial report", error);
				setReportState("error");
			}
		}

		void loadData();
	}, []);

	const chartData = report ? createFinancialChartData(report) : [];

	return { report, chartData, reportState };
}
