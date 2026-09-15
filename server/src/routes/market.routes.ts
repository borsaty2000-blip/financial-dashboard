import { Router } from 'express'
import {
	getEgxMetals,
	getEgxQuote,
	getEgxSummary,
} from '../services/market/egx.adapter.js'
import {
	getTasiCompanies,
	getTasiQuote,
	getTasiSummary,
} from '../services/market/sahmk.adapter.js'
import {
	CandlesService,
	type CandleMarket,
} from '../services/market/candles.service.js'
import {
	getEgyptCompanies,
	getSaudiCompanies,
} from '../services/market/twelve-data.adapter.js'
import { FundamentalsService } from '../services/market/fundamentals.service.js'
import { live, unavailable } from '../services/market/market.types.js'

export const marketRoutes = Router()

const arabicCompanyNames: Record<string, string> = {
	'1010': 'بنك الرياض',
	'1120': 'مصرف الراجحي',
	'2010': 'سابك',
	'2222': 'أرامكو السعودية',
	COMI: 'البنك التجاري الدولي',
	ETEL: 'المصرية للاتصالات',
	SWDY: 'السويدي إليكتريك',
	TMGH: 'مجموعة طلعت مصطفى',
}

marketRoutes.get('/company/:symbol', async (request, response) => {
	const symbol = request.params.symbol.toUpperCase()
	const market = /^\d{4,5}$/u.test(symbol) ? 'TASI' : 'EGX'
	try {
		const companies =
			market === 'TASI' ? await getSaudiCompanies() : await getEgyptCompanies()
		const match = companies.find((company) => company.symbol === symbol)
		return response.json({
			symbol,
			nameAr: arabicCompanyNames[symbol] ?? match?.name ?? symbol,
			name: match?.name ?? symbol,
			market,
		})
	} catch {
		return response.json({
			symbol,
			nameAr: arabicCompanyNames[symbol] ?? symbol,
			name: symbol,
			market,
		})
	}
})

marketRoutes.get('/fundamentals/:symbol', async (request, response) => {
	try {
		return response.json(
			await FundamentalsService.getFundamentals(request.params.symbol),
		)
	} catch {
		return response.status(502).json({
			available: false,
			error: 'Fundamentals unavailable',
		})
	}
})

marketRoutes.get('/quote/:symbol', async (request, response) => {
	const market: CandleMarket =
		request.query.market === 'TASI' || request.query.market === 'GLOBAL'
			? request.query.market
			: 'EGX'
	response.json(await CandlesService.getQuote(request.params.symbol, market))
})

marketRoutes.get('/candles/:symbol', async (request, response) => {
	const market: CandleMarket =
		request.query.market === 'TASI' || request.query.market === 'GLOBAL'
			? request.query.market
			: 'EGX'
	const days = Math.min(Math.max(Number(request.query.days ?? 120), 30), 500)
	response.json(
		await CandlesService.getCandles(
			request.params.symbol,
			market,
			typeof request.query.interval === 'string'
				? request.query.interval
				: '1d',
			days,
		),
	)
})

marketRoutes.get('/egx/summary', async (_request, response) => {
	response.json(await getEgxSummary())
})

marketRoutes.get('/summary', async (_request, response) => {
	const [egx, tasi] = await Promise.all([getEgxSummary(), getTasiSummary()])
	response.json({
		data: { egx, tasi, gold: egx.data.gold, silver: egx.data.silver },
		available: egx.available || tasi.available,
		timestamp: new Date().toISOString(),
	})
})

marketRoutes.get('/gold', async (_request, response) => {
	response.json(await getEgxMetals('gold'))
})

marketRoutes.get('/silver', async (_request, response) => {
	response.json(await getEgxMetals('silver'))
})

marketRoutes.get('/egx/companies', async (_request, response) => {
	try {
		response.json(live('Twelve Data', await getEgyptCompanies()))
	} catch (error) {
		response.json(
			unavailable(
				'Twelve Data',
				error instanceof Error ? error.message : 'EGX directory unavailable',
			),
		)
	}
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
