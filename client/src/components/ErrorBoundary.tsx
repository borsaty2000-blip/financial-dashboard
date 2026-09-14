import { Component, type ErrorInfo, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { hasError: boolean; message: string }

export default class ErrorBoundary extends Component<Props, State> {
	state: State = { hasError: false, message: '' }
	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, message: error.message }
	}
	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error('Borsaty UI error', error, info)
	}
	render() {
		if (!this.state.hasError) return this.props.children
		return (
			<main className="error-page" dir="rtl" role="alert">
				<div className="error-card">
					<strong>حدث خطأ غير متوقع</strong>
					<p>تعذر تحميل هذا القسم. يمكنك إعادة المحاولة دون فقدان بياناتك.</p>
					<button
						className="primary-button"
						onClick={() => window.location.reload()}
					>
						إعادة المحاولة
					</button>
				</div>
			</main>
		)
	}
}
