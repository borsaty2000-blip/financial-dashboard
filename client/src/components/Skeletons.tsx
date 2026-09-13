export function StockListSkeleton() {
	return (
		<div className="skeleton-list" aria-label="جار التحميل">
			{[1, 2, 3, 4].map((item) => (
				<div className="skeleton-row" key={item}>
					<i />
					<span />
					<b />
				</div>
			))}
		</div>
	)
}
export function StockDetailSkeleton() {
	return (
		<div className="skeleton-detail" aria-label="جار التحميل">
			<i />
			<span />
			<span />
			<b />
		</div>
	)
}
export function PortfolioSkeleton() {
	return (
		<div className="skeleton-metrics" aria-label="جار التحميل">
			{[1, 2, 3].map((item) => (
				<i key={item} />
			))}
		</div>
	)
}
export function AnalysisSkeleton() {
	return (
		<div className="skeleton-analysis" aria-label="جار التحميل">
			<i />
			<i />
			<i />
		</div>
	)
}
