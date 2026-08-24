import { type ReactNode, useId } from "react";

export interface TableProps {
	caption: string;
	children: ReactNode;
}

export default function Table({ caption, children }: TableProps) {
	const captionId = useId();

	return (
		<div
			role="region"
			aria-labelledby={captionId}
			tabIndex={0}
			className="focus-ring w-full overflow-x-auto rounded-lg bg-white"
		>
			<table className="w-full min-w-max">
				<caption id={captionId} className="sr-only">
					{caption}
				</caption>
				{children}
			</table>
		</div>
	);
}
