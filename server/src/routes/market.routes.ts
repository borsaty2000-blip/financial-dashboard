import { Router } from 'express'
import { getEgxQuote, getEgxSummary } from '../services/market/egx.adapter.js'
import {
	getTasiCompanies,
	getTasiQuote,
	getTasiSummary,
} from '../services/market/sahmk.adapter.js'

export const marketRoutes = Router()

marketRoutes.get('/egx/summary', async (_request, response) => {
	response.json(await getEgxSummary())
})

marketRoutes.get('/egx/companies', (_request, response) => {
	response.json({
		data: [],
		source: 'EGX MCP',
		timestamp: new Date().toISOString(),
		freshness: 'cached',
		delay_minutes: 15,
		available: false,
		error:
			'The official EGX repository exposes stock and metals tools, not a company-directory tool.',
	})
})

marketRoutes.get('/egx/quote/:symbol', async (request, response) => {
	response.json(await getEgxQuote(request.params.symbol.toUpperCase()))
})

marketRoutes.get('/tasi/summary', async (_request, response) => {
	response.json(await getTasiSummary())
})

marketRoutes.get('/tasi/quote/:symbol', async (request, response) => {
	response.json(await getTasiQuote(request.params.symbol))
})

marketRoutes.get('/tasi/companies', async (request, response) => {
	response.json(
		await getTasiCompanies(
			typeof request.query.search === 'string'
				? request.query.search
				: undefined,
		),
	)
})
