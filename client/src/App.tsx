import { lazy, Suspense } from 'react'
import { AuthProvider } from './contexts/AuthContext'
import { ToastProvider } from './contexts/ToastContext'
import ProtectedRoute from './components/ProtectedRoute'
import InstallPrompt from './components/InstallPrompt'
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
import {
	AboutPage,
	DisclaimerPage,
	NotFoundPage,
	PrivacyPage,
	TermsPage,
} from './pages/LegalPages'

const FinancialReportSection = lazy(
	() => import('@client/modules/financial-report/ui/FinancialReportSection'),
)

function RoutedApp() {
	const location = useLocation()
	const path = location.split('?')[0]
	if (path === '/login') return <LoginPage />
	if (path === '/register') return <RegisterPage />
	if (path === '/forgot-password') return <ForgotPage />
	if (path.startsWith('/reset-password/')) return <ResetPage />
	if (path === '/terms') return <TermsPage />
	if (path === '/privacy') return <PrivacyPage />
	if (path === '/disclaimer') return <DisclaimerPage />
	if (path === '/about') return <AboutPage />
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
	if (path !== '/') return <NotFoundPage />
	return (
		<main className="legacy-page">
			<Suspense
				fallback={<div className="loading-screen">جارٍ تحميل التقرير...</div>}
			>
				<FinancialReportSection />
			</Suspense>
		</main>
	)
}
export function App() {
	return (
		<AuthProvider>
			<ToastProvider>
				<RoutedApp />
				<InstallPrompt />
			</ToastProvider>
		</AuthProvider>
	)
}
