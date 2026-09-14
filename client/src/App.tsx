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
import { BacktestPage, CandlestickPage } from './pages/AnalysisToolsPage'
import { AlertsPage, WatchlistsPage } from './pages/UserToolsPages'
import { PortfolioPage } from './pages/PortfolioPage'
import { ComparisonPage } from './pages/ComparisonPage'
import GlobalSearch from './components/GlobalSearch'
import ErrorBoundary from './components/ErrorBoundary'
import MobileChrome from './components/MobileChrome'
import { StockDetailPage } from './pages/StockDetailPage'
import { SimulatorPage } from './pages/SimulatorPage'
import { ShariahPage } from './pages/ShariahPage'
import { SmartPortfolioPage } from './pages/SmartPortfolioPage'
import { WeeklyReportPage } from './pages/WeeklyReportPage'
import { GlobalComparisonPage } from './pages/GlobalComparisonPage'
import { AnalystsPage } from './pages/AnalystsPage'
import { AnalystApplyPage } from './pages/AnalystApplyPage'
import { DeveloperDashboardPage } from './pages/DeveloperDashboardPage'
import { DigitalTwinPage } from './pages/DigitalTwinPage'
import NotificationLive from './components/NotificationLive'
import { LiveAnalysisFeed } from './components/Analysis/LiveAnalysisFeed'

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
	if (path === '/backtest') return <BacktestPage />
	if (path === '/candlestick') return <CandlestickPage />
	if (path === '/simulator') return <SimulatorPage />
	if (path === '/shariah') return <ShariahPage />
	if (path === '/portfolio/smart')
		return (
			<ProtectedRoute>
				<SmartPortfolioPage />
			</ProtectedRoute>
		)
	if (path === '/watchlists' || path === '/alerts')
		return (
			<ProtectedRoute>
				{path === '/watchlists' ? <WatchlistsPage /> : <AlertsPage />}
			</ProtectedRoute>
		)
	if (path === '/portfolio')
		return (
			<ProtectedRoute>
				<PortfolioPage />
			</ProtectedRoute>
		)
	if (path === '/compare') return <ComparisonPage />
	if (path === '/compare/global') return <GlobalComparisonPage />
	if (path === '/analysts' || path.startsWith('/analysts/'))
		return <AnalystsPage />
	if (path === '/analysts/apply')
		return (
			<ProtectedRoute>
				<AnalystApplyPage />
			</ProtectedRoute>
		)
	if (path === '/developer/dashboard')
		return (
			<ProtectedRoute>
				<DeveloperDashboardPage />
			</ProtectedRoute>
		)
	if (path === '/twin')
		return (
			<ProtectedRoute>
				<DigitalTwinPage />
			</ProtectedRoute>
		)
	if (path === '/weekly-report' || path === '/reports/weekly')
		return (
			<ProtectedRoute>
				<WeeklyReportPage />
			</ProtectedRoute>
		)
	if (path.startsWith('/stock/'))
		return <StockDetailPage symbol={path.slice('/stock/'.length)} />
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
		<ErrorBoundary>
			<AuthProvider>
				<ToastProvider>
					<RoutedApp />
					<MobileChrome />
					<GlobalSearch />
					<InstallPrompt />
					<NotificationLive />
					<LiveAnalysisFeed />
				</ToastProvider>
			</AuthProvider>
		</ErrorBoundary>
	)
}
