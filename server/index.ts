import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import express from 'express'
import { authRoutes } from './src/routes/auth.routes.js'
import { publicRateLimit } from './src/middleware/rateLimit.js'
import { profileRoutes } from './src/routes/profile.routes.js'
import { preferencesRoutes } from './src/routes/preferences.routes.js'
import { achievementsRoutes } from './src/routes/achievements.routes.js'

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

const rawData = readFileSync(new URL('./data.json', import.meta.url), 'utf8')
const financialData: unknown = JSON.parse(rawData)
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

app.get('/api/market/summary', (_request, response) => {
	response.json({ ok: true, available: false, data: {} })
})

app.get('/api/market/egx/summary', (_request, response) => {
	response.json({ ok: true, available: false, data: {} })
})

app.use('/api/auth', authRoutes)
app.use(
	'/uploads',
	express.static(path.join(process.cwd(), 'server', 'uploads')),
)
app.use('/api/profile', profileRoutes)
app.use('/api/preferences', preferencesRoutes)
app.use('/api/achievements', achievementsRoutes)

export default app

if (!process.env.VERCEL) {
	app.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`)
	})
}
