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
import { EconomicCalendarPage } from './pages/EconomicCalendarPage'
import { NewsPage } from './pages/NewsPage'
import { AdvancedScreenerPage } from './pages/AdvancedScreenerPage'
import { PortfolioAnalyticsPage } from './pages/PortfolioAnalyticsPage'
import { SpecializedCalendarsPage } from './pages/SpecializedCalendarsPage'
import { AdditionalMarketsPage } from './pages/AdditionalMarketsPage'
import { CurrencyConverter } from './components/CurrencyConverter'
import { ComprehensiveComparisonPage } from './pages/ComprehensiveComparisonPage'
import { DeveloperDocsPage } from './pages/DeveloperDocsPage'
import { TelegramSettingsPage } from './pages/TelegramSettingsPage'
import {
	AnalystDashboardPage,
	AnalystProfilePage,
	MySubscriptionsPage,
} from './pages/AnalystProgramPages'
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
	if (path === '/analysts/apply')
		return (
			<ProtectedRoute>
				<AnalystApplyPage />
			</ProtectedRoute>
		)
	if (path === '/analysts/dashboard')
		return (
			<ProtectedRoute>
				<AnalystDashboardPage />
			</ProtectedRoute>
		)
	if (path === '/my/subscriptions')
		return (
			<ProtectedRoute>
				<MySubscriptionsPage />
			</ProtectedRoute>
		)
	if (path === '/analysts' || path.startsWith('/analysts/'))
		return path === '/analysts' ? (
			<AnalystsPage />
		) : (
			<AnalystProfilePage username={path.slice('/analysts/'.length)} />
		)
	if (path === '/developer/dashboard')
		return (
			<ProtectedRoute>
				<DeveloperDashboardPage />
			</ProtectedRoute>
		)
	if (path === '/developer/docs') return <DeveloperDocsPage />
	if (path === '/settings/telegram')
		return (
			<ProtectedRoute>
				<TelegramSettingsPage />
			</ProtectedRoute>
		)
	if (path === '/twin')
		return (
			<ProtectedRoute>
				<DigitalTwinPage />
			</ProtectedRoute>
		)
	if (path === '/calendar') return <EconomicCalendarPage />
	if (path === '/calendar/ipo') return <SpecializedCalendarsPage kind="ipo" />
	if (path === '/calendar/dividends')
		return <SpecializedCalendarsPage kind="dividends" />
	if (path === '/calendar/earnings')
		return <SpecializedCalendarsPage kind="earnings" />
	if (path === '/calendar/splits')
		return <SpecializedCalendarsPage kind="splits" />
	if (path === '/markets/forex') return <AdditionalMarketsPage kind="forex" />
	if (path === '/markets/commodities')
		return <AdditionalMarketsPage kind="commodities" />
	if (path === '/markets/crypto') return <AdditionalMarketsPage kind="crypto" />
	if (path === '/markets/etf') return <AdditionalMarketsPage kind="etf" />
	if (path === '/markets/bonds') return <AdditionalMarketsPage kind="bonds" />
	if (path === '/compare/sectors')
		return <ComprehensiveComparisonPage kind="sectors" />
	if (path === '/compare/periods')
		return <ComprehensiveComparisonPage kind="periods" />
	if (path === '/compare/watchlist')
		return (
			<ProtectedRoute>
				<ComprehensiveComparisonPage kind="watchlist" />
			</ProtectedRoute>
		)
	if (path === '/news') return <NewsPage />
	if (path === '/screener') return <AdvancedScreenerPage />
	if (path === '/portfolio/analytics')
		return (
			<ProtectedRoute>
				<PortfolioAnalyticsPage />
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
					<CurrencyConverter />
					<a
						className="telegram-quick-link"
						href="/settings/telegram"
						title="ربط Telegram"
					>
						Telegram
					</a>
					<InstallPrompt />
					<NotificationLive />
					<LiveAnalysisFeed />
				</ToastProvider>
			</AuthProvider>
		</ErrorBoundary>
	)
}
