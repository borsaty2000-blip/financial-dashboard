import { type ReactNode, useId } from 'react'

export interface HierarchicalTableProps {
	caption: string
	children: ReactNode
}

export default function HierarchicalTable({
	caption,
	children,
}: HierarchicalTableProps) {
	const captionId = useId()

	return (
		<div
			role="region"
			aria-labelledby={captionId}
			tabIndex={0}
			className="table-focus-ring w-full overflow-x-auto rounded-lg bg-white"
		>
			<table className="w-full min-w-max">
				<caption id={captionId} className="sr-only">
					{caption}
				</caption>
				{children}
			</table>
		</div>
	)
}
