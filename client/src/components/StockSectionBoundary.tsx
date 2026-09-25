import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode; label: string }
type State = { hasError: boolean }

declare global {
	interface Window {
		__lastStockError?: {
			message: string
			stack?: string
			componentStack?: string
			section?: string
		}
	}
}

export class StockSectionBoundary extends Component<Props, State> {
	state: State = { hasError: false }

	static getDerivedStateFromError(): State {
		return { hasError: true }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		window.__lastStockError = {
			message: error.message,
			stack: error.stack,
			componentStack: info.componentStack ?? undefined,
			section: this.props.label,
		}
		if (import.meta.env.DEV)
			console.error(`[StockSectionBoundary:${this.props.label}]`, error, info)
	}

	render() {
		if (this.state.hasError) {
			return (
				<section className="analysis-card error-section" role="status">
					<strong>تعذر عرض هذا القسم. جاري إعادة المحاولة...</strong>
					<p>{this.props.label}</p>
					<button className="link-button" type="button" onClick={() => this.setState({ hasError: false })}>
						إعادة المحاولة
					</button>
				</section>
			)
		}
		return this.props.children
	}
}

export default StockSectionBoundary
