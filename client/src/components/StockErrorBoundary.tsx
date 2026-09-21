import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message?: string }

export class StockErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false }

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, message: error.message }
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		if (import.meta.env.DEV) console.error('[StockErrorBoundary]', error, info)
	}

	private retry = () => {
		this.setState({ hasError: false, message: undefined })
		window.location.reload()
	}

	render() {
		if (!this.state.hasError) return this.props.children

		return (
			<main className="error-page stock-error-page" dir="rtl" role="alert">
				<div className="error-card">
					<strong>تعذر تحميل صفحة السهم</strong>
					<p>حدث خطأ أثناء عرض بيانات السهم. يمكنك المحاولة مرة أخرى.</p>
					{import.meta.env.DEV && this.state.message ? (
						<small>{this.state.message}</small>
					) : null}
					<button className="primary-button" onClick={this.retry}>
						إعادة المحاولة
					</button>
				</div>
			</main>
		)
	}
}

export default StockErrorBoundary
