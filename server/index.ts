import 'dotenv/config'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { authRoutes } from './src/routes/auth.routes.js'
import { publicRateLimit } from './src/middleware/rateLimit.js'

const app = express()
app.use(express.json())
app.use(publicRateLimit)
const port = Number(process.env.PORT ?? 4000)
const allowedOrigins = (process.env.CORS_ORIGINS ?? '*')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean)

app.use((request, response, next) => {
	const origin = request.headers.origin
	if (
		allowedOrigins.includes('*') ||
		(origin && allowedOrigins.includes(origin))
	) {
		response.setHeader(
			'Access-Control-Allow-Origin',
			allowedOrigins.includes('*') ? '*' : (origin as string),
		)
	}
	response.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
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

app.use('/api/auth', authRoutes)

export default app

if (!process.env.VERCEL) {
	app.listen(port, () => {
		console.log(`Server running at http://localhost:${port}`)
	})
}
