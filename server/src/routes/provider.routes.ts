import { Router } from 'express'
import {
	providerConfig,
	testProvider,
	type ProviderMarket,
} from '../services/market/provider.service.js'

const providerRoutes = Router()
const markets = new Set<ProviderMarket>([
	'EGX',
	'TASI',
	'CRYPTO',
	'FOREX',
	'COMMODITIES',
])

providerRoutes.get('/config', (_request, response) => {
	response.json(providerConfig())
})

providerRoutes.get('/test', async (request, response) => {
	const market = String(
		request.query.market ?? 'EGX',
	).toUpperCase() as ProviderMarket
	const symbol = String(request.query.symbol ?? '').trim()
	const interval = String(request.query.interval ?? '1m')
	if (!markets.has(market) || !symbol)
		return response.status(400).json({
			status: 'error',
			message: 'market و symbol مطلوبان',
		})
	const data = await testProvider(symbol, market, interval)
	return response.json({
		status:
			data.data_quality.status === 'unavailable' ? 'unavailable' : 'success',
		market,
		symbol,
		...data,
	})
})

export { providerRoutes }
