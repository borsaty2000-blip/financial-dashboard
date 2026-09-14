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
	AcceptableUsePage,
	AccessibilityPage,
	CookiePolicyPage,
	CopyrightPage,
	DisclaimerPage,
	NotFoundPage,
	PrivacyPage,
	RefundPolicyPage,
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
import { LanguageSwitcher } from './components/LanguageSwitcher'
import { NotificationSettingsPage } from './pages/NotificationSettingsPage'
import { SecuritySettingsPage } from './pages/SecuritySettingsPage'
import { EducationPage } from './pages/EducationPages'
import { VoiceAssistantWidget } from './components/VoiceAssistantWidget'
import { LiveChatWidget } from './components/LiveChatWidget'
import AIAssistantWidget from './components/AIAssistantWidget'
import { SectionActivityBar } from './components/SectionActivityBar'
import { HelpPage, SupportPage, TicketsPage } from './pages/SupportPages'
import { RegionalSettingsPage } from './pages/RegionalSettingsPage'
import {
	BlogPage,
	CommunityPage,
	EnterprisePage,
	ReferralPage,
	VideoLibraryPage,
} from './pages/MarketLeadershipPages'
import { AnalysisOverviewPage, PublicHomePage } from './pages/PublicPages'

const FinancialReportSection = lazy(
	() => import('@client/modules/financial-report/ui/FinancialReportSection'),
)
const StrategyBuilderPage = lazy(() =>
	Promise.race([
		import('./pages/StrategyBuilderPage'),
		new Promise<never>((_, reject) =>
			window.setTimeout(
				() => reject(new Error('تعذر تحميل منشئ الاستراتيجيات')),
				15_000,
			),
		),
	]),
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
	if (path === '/cookie-policy') return <CookiePolicyPage />
	if (path === '/acceptable-use') return <AcceptableUsePage />
	if (path === '/refund-policy') return <RefundPolicyPage />
	if (path === '/copyright') return <CopyrightPage />
	if (path === '/accessibility') return <AccessibilityPage />
	if (path === '/support') return <SupportPage />
	if (path === '/support/tickets')
		return (
			<ProtectedRoute>
				<TicketsPage />
			</ProtectedRoute>
		)
	if (path === '/support/tickets/new')
		return (
			<ProtectedRoute>
				<TicketsPage create />
			</ProtectedRoute>
		)
	if (path.startsWith('/support/tickets/'))
		return (
			<ProtectedRoute>
				<TicketsPage detail id={path.slice('/support/tickets/'.length)} />
			</ProtectedRoute>
		)
	if (path === '/help') return <HelpPage />
	if (path.startsWith('/help/article/'))
		return <HelpPage slug={path.slice('/help/article/'.length)} />
	if (path.startsWith('/help/'))
		return <HelpPage category={path.slice('/help/'.length)} />
	if (path === '/backtest') return <BacktestPage />
	if (path === '/analysis/consensus') return <BacktestPage />
	if (path === '/analysis/elliott')
		return <AnalysisOverviewPage engine="elliott" />
	if (path === '/analysis/gann') return <AnalysisOverviewPage engine="gann" />
	if (path === '/markets/egx') return <PublicHomePage focus="EGX" />
	if (path === '/markets/tasi') return <PublicHomePage focus="TASI" />
	if (path === '/strategies' || path === '/strategy-builder')
		return (
			<Suspense
				fallback={
					<div className="loading-screen">جارٍ تحميل منشئ الاستراتيجيات...</div>
				}
			>
				<StrategyBuilderPage />
			</Suspense>
		)
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
	if (path === '/settings/notifications')
		return (
			<ProtectedRoute>
				<NotificationSettingsPage />
			</ProtectedRoute>
		)
	if (path === '/settings/security')
		return (
			<ProtectedRoute>
				<SecuritySettingsPage />
			</ProtectedRoute>
		)
	if (path === '/settings/regional')
		return (
			<ProtectedRoute>
				<RegionalSettingsPage />
			</ProtectedRoute>
		)
	if (path === '/education') return <EducationPage />
	if (path === '/learning') return <EducationPage />
	if (path === '/education/my-courses')
		return (
			<ProtectedRoute>
				<EducationPage mode="my" />
			</ProtectedRoute>
		)
	if (path === '/education/certificates')
		return (
			<ProtectedRoute>
				<EducationPage mode="certificates" />
			</ProtectedRoute>
		)
	if (path.startsWith('/education/') && path.includes('/lessons/'))
		return (
			<ProtectedRoute>
				<EducationPage mode="lesson" id={path.split('/lessons/')[1] ?? ''} />
			</ProtectedRoute>
		)
	if (path.startsWith('/education/'))
		return <EducationPage mode="course" id={path.slice('/education/'.length)} />
	if (path === '/community') return <CommunityPage />
	if (path === '/community/leaderboard')
		return <CommunityPage mode="leaderboard" />
	if (path === '/leaderboard') return <CommunityPage mode="leaderboard" />
	if (path.startsWith('/community/topics/'))
		return (
			<CommunityPage
				mode="topic"
				id={path.slice('/community/topics/'.length)}
			/>
		)
	if (path === '/community/categories' || path === '/community/new')
		return <CommunityPage />
	if (path === '/videos') return <VideoLibraryPage />
	if (path.startsWith('/videos/'))
		return <VideoLibraryPage id={path.slice('/videos/'.length)} />
	if (path === '/webinars') return <VideoLibraryPage webinars />
	if (
		path === '/enterprise' ||
		path === '/enterprise/apply' ||
		path === '/organization/dashboard'
	)
		return <EnterprisePage />
	if (path === '/referrals')
		return (
			<ProtectedRoute>
				<ReferralPage />
			</ProtectedRoute>
		)
	if (path === '/blog') return <BlogPage />
	if (path.startsWith('/blog/'))
		return <BlogPage slug={path.slice('/blog/'.length)} />
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
	if (path === '/stock') return <NotFoundPage />
	if (path.startsWith('/stock/'))
		return <StockDetailPage symbol={path.slice('/stock/'.length)} />
	if (
		path === '/dashboard' ||
		path === '/achievements' ||
		path === '/profile' ||
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
	if (path === '/financial-report')
		return (
			<main className="legacy-page">
				<Suspense
					fallback={<div className="loading-screen">جارٍ تحميل التقرير...</div>}
				>
					<FinancialReportSection />
				</Suspense>
			</main>
		)
	if (path !== '/') return <NotFoundPage />
	return <PublicHomePage />
}
export function App() {
	const location = useLocation()
	return (
		<ErrorBoundary>
			<AuthProvider>
				<ToastProvider>
					<RoutedApp />
					<SectionActivityBar path={location.split('?')[0]} />
					<MobileChrome />
					<GlobalSearch />
					<CurrencyConverter />
					<LanguageSwitcher />
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
					<VoiceAssistantWidget />
					<AIAssistantWidget />
					<LiveChatWidget />
				</ToastProvider>
			</AuthProvider>
		</ErrorBoundary>
	)
}
