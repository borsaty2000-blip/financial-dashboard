import FinancialReportSection from '@client/modules/financial-report/ui/FinancialReportSection'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import { useLocation } from './router'
import {
	AchievementsPage,
	DashboardPage,
	ForgotPage,
	LoginPage,
	ProfilePage,
	RegisterPage,
	ResetPage,
} from './pages/AccountPages'

function RoutedApp() {
	const location = useLocation()
	const path = location.split('?')[0]
	if (path === '/login') return <LoginPage />
	if (path === '/register') return <RegisterPage />
	if (path === '/forgot-password') return <ForgotPage />
	if (path.startsWith('/reset-password/')) return <ResetPage />
	if (
		path === '/dashboard' ||
		path === '/achievements' ||
		path.startsWith('/profile/')
	)
		return (
			<ProtectedRoute>
				{path === '/dashboard' ? (
					<DashboardPage />
				) : path === '/achievements' ? (
					<AchievementsPage />
				) : (
					<ProfilePage />
				)}
			</ProtectedRoute>
		)
	return (
		<main className="legacy-page">
			<FinancialReportSection />
		</main>
	)
}
export function App() {
	return (
		<AuthProvider>
			<ToastProvider>
				<RoutedApp />
			</ToastProvider>
		</AuthProvider>
	)
}
