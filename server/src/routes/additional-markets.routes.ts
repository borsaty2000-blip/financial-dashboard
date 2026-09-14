import { Router } from 'express'
import { BondsService } from '../services/market/bonds.service.js'
import { CommoditiesService } from '../services/market/commodities.service.js'
import { CryptoService } from '../services/market/crypto.service.js'
import { ETFService } from '../services/market/etf.service.js'
import { ForexService } from '../services/market/forex.service.js'
import { CurrencyService } from '../services/tools/currency.service.js'
export const additionalMarketsRoutes = Router()
additionalMarketsRoutes.get('/forex', async (_req, res) =>
	res.json({
		data: ForexService.getCurrencyPairs(),
		major: ForexService.getMajorPairs(),
		count: ForexService.getCurrencyPairs().length,
	}),
)
additionalMarketsRoutes.get('/forex/:pair', async (req, res) =>
	res.json(await ForexService.getQuote(req.params.pair)),
)
additionalMarketsRoutes.get('/forex/:pair/history', async (req, res) =>
	res.json(
		await ForexService.getHistorical(
			req.params.pair,
			String(req.query.period ?? '1M'),
		),
	),
)
additionalMarketsRoutes.get('/commodities', (_req, res) =>
	res.json({
		data: CommoditiesService.list(),
		count: CommoditiesService.list().length,
	}),
)
additionalMarketsRoutes.get('/commodities/:symbol', async (req, res) =>
	res.json(await CommoditiesService.getQuote(req.params.symbol)),
)
additionalMarketsRoutes.get('/crypto', async (_req, res) =>
	res.json(await CryptoService.list()),
)
additionalMarketsRoutes.get('/crypto/:symbol', async (req, res) =>
	res.json(await CryptoService.get(req.params.symbol)),
)
additionalMarketsRoutes.get('/etf', (_req, res) =>
	res.json({ data: ETFService.list(), count: ETFService.list().length }),
)
additionalMarketsRoutes.get('/etf/:symbol', async (req, res) =>
	res.json(await ETFService.get(req.params.symbol)),
)
additionalMarketsRoutes.get('/bonds', (_req, res) =>
	res.json({ data: BondsService.list(), count: BondsService.list().length }),
)
additionalMarketsRoutes.get('/bonds/:symbol', async (req, res) =>
	res.json(await BondsService.get(req.params.symbol)),
)
export const currencyRoutes = Router()
currencyRoutes.post('/convert', async (req, res) => {
	try {
		const amount = Number(req.body.amount)
		if (
			!req.body.from ||
			!req.body.to ||
			!Number.isFinite(amount) ||
			amount < 0
		)
			return res.status(400).json({ error: 'بيانات التحويل غير صالحة' })
		return res.json(
			await CurrencyService.convert(req.body.from, req.body.to, amount),
		)
	} catch (error) {
		return res
			.status(502)
			.json({
				available: false,
				error:
					error instanceof Error ? error.message : 'Conversion unavailable',
			})
	}
})
currencyRoutes.get('/rates', async (req, res) => {
	try {
		return res.json(
			await CurrencyService.getRates(String(req.query.base ?? 'EGP')),
		)
	} catch (error) {
		return res
			.status(502)
			.json({
				available: false,
				error: error instanceof Error ? error.message : 'Rates unavailable',
			})
	}
})
currencyRoutes.get('/historical', async (req, res) => {
	try {
		return res.json(
			await CurrencyService.getHistoricalRate(
				String(req.query.from ?? 'USD'),
				String(req.query.to ?? 'EGP'),
				String(req.query.date),
			),
		)
	} catch (error) {
		return res
			.status(502)
			.json({
				available: false,
				error:
					error instanceof Error
						? error.message
						: 'Historical rate unavailable',
			})
	}
})
