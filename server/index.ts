import 'dotenv/config'
import { createServer } from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express from 'express'
import { authRoutes } from './src/routes/auth.routes.js'
import { publicRateLimit } from './src/middleware/rateLimit.js'
import { profileRoutes } from './src/routes/profile.routes.js'
import { preferencesRoutes } from './src/routes/preferences.routes.js'
import { achievementsRoutes } from './src/routes/achievements.routes.js'
import { marketRoutes } from './src/routes/market.routes.js'
import { analysisRoutes } from './src/routes/analysis.routes.js'
import { shariahRoutes } from './src/routes/shariah.routes.js'
import { tradingViewRoutes } from './src/routes/tradingview.routes.js'
import { backtestRoutes } from './src/routes/backtest.routes.js'
import { attachSignalSocket } from './src/services/tradingview/signal-bus.js'
import { userToolsRoutes } from './src/routes/user-tools.routes.js'
import { startAlertChecker } from './src/services/alerts-checker.service.js'
import { tradingRoutes } from './src/routes/trading.routes.js'
import { searchRoutes } from './src/routes/search.routes.js'
import { comparisonRoutes } from './src/routes/comparison.routes.js'
import { simulatorRoutes } from './src/routes/simulator.routes.js'
import { smartPortfolioRoutes } from './src/routes/smart-portfolio.routes.js'
import { insightsRoutes } from './src/routes/insights.routes.js'
import {
	developerApiRoutes,
	developerRoutes,
} from './src/routes/developer.routes.js'
import { audioRoutes } from './src/routes/audio.routes.js'
import { whatsappRoutes } from './src/routes/whatsapp.routes.js'
import { telegramRoutes } from './src/routes/telegram.routes.js'
import { analystsRoutes } from './src/routes/analysts.routes.js'
import { fundamentalsRoutes } from './src/routes/fundamentals.routes.js'
import { calendarRoutes } from './src/routes/calendar.routes.js'
import { newsRoutes } from './src/routes/news.routes.js'
import { screenerRoutes } from './src/routes/screener.routes.js'
import { specializedCalendarRoutes } from './src/routes/specialized-calendar.routes.js'
import {
	additionalMarketsRoutes,
	currencyRoutes,
} from './src/routes/additional-markets.routes.js'
import { comprehensiveComparisonRoutes } from './src/routes/comprehensive-comparison.routes.js'
import { governanceRoutes } from './src/routes/governance.routes.js'

const app = express()
app.use(express.json())
app.use(publicRateLimit)
const port = Number(process.env.PORT ?? 4000)

const allowedOrigins = [
	'https://borsatyai.com',
	'https://www.borsatyai.com',
	'https://financial-dashboard-borsaty.netlify.app',
	...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : []),
	...(process.env.CORS_ORIGINS ?? '').split(','),
]
	.map((origin) => origin.trim())
	.filter(Boolean)
app.use((request, response, next) => {
	const origin = request.headers.origin
	if (!origin || allowedOrigins.includes(origin)) {
		if (origin) response.setHeader('Access-Control-Allow-Origin', origin)
	}
	response.setHeader('Access-Control-Allow-Credentials', 'true')
	response.setHeader(
		'Access-Control-Allow-Methods',
		'GET,POST,PUT,PATCH,DELETE,OPTIONS',
	)
	response.setHeader(
		'Access-Control-Allow-Headers',
		'Content-Type,Authorization',
	)
	if (request.method === 'OPTIONS') {
		response.sendStatus(204)
		return
	}
	next()
})

const dataCandidates = [
	fileURLToPath(new URL('./data.json', import.meta.url)),
	path.join(process.cwd(), 'server', 'data.json'),
	path.join(process.cwd(), 'data.json'),
]
const dataPath = dataCandidates.find((candidate) => existsSync(candidate))
const financialData: unknown = dataPath
	? JSON.parse(readFileSync(dataPath, 'utf8'))
	: { periods: [], company: { id: '', name: '', values: [], children: [] } }
const avatarsDirectory = fileURLToPath(new URL('./avatars', import.meta.url))

app.get('/api/avatars/:fileName', (request, response, next) => {
	response.sendFile(
		request.params.fileName,
		{ root: avatarsDirectory },
		(error) => {
			if (error) next(error)
		},
	)
})

app.get('/api/financial-report', (_request, response) => {
	response.json(financialData)
})

app.get('/api/health', (_request, response) => {
	response.json({ ok: true, service: 'financial-dashboard-api' })
})

app.use('/api/auth', authRoutes)
app.use('/api/market', marketRoutes)
app.use('/api/fundamentals', fundamentalsRoutes)
app.use('/api/calendar', calendarRoutes)
app.use('/api/calendar', specializedCalendarRoutes)
app.use('/api/market', additionalMarketsRoutes)
app.use('/api/tools', currencyRoutes)
app.use('/api/comparison', comprehensiveComparisonRoutes)
app.use('/api', governanceRoutes)
app.use('/api/news', newsRoutes)
app.use('/api/screener', screenerRoutes)
app.use('/api/analysis', analysisRoutes)
app.use('/api/shariah', shariahRoutes)
app.use('/api/tradingview/webhook', tradingViewRoutes)
app.use('/api/backtest', backtestRoutes)
app.use('/api/trading', tradingRoutes)
app.use('/api/search', searchRoutes)
app.use('/api/comparison', comparisonRoutes)
app.use('/api/simulator', simulatorRoutes)
app.use('/api/portfolio', smartPortfolioRoutes)
app.use('/api', insightsRoutes)
app.use('/api/developer', developerRoutes)
app.use('/api/v1', developerApiRoutes)
app.use('/api/analysis', audioRoutes)
app.use('/api/alerts', whatsappRoutes)
app.use('/api', telegramRoutes)
app.use('/api/analysts', analystsRoutes)
app.use(
	'/uploads',
	express.static(path.join(process.cwd(), 'server', 'uploads')),
)
app.use('/api/profile', profileRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/achievements', achievementsRoutes)
app.use('/api', userToolsRoutes)

export default app

if (!process.env.VERCEL) {
	startAlertChecker()
	const httpServer = createServer(app)
	attachSignalSocket(httpServer)
	httpServer.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`)
	})
}
