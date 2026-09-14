import { Router } from 'express'
import { z } from 'zod'
import {
	formatPrice,
	listCurrencies,
	listMarkets,
	localSettings,
} from '../services/regional/regional.service.js'

export const regionalRoutes = Router()
regionalRoutes.get('/regional/markets', async (_req, res) =>
	res.json(await listMarkets()),
)
regionalRoutes.get('/regional/currencies', async (_req, res) =>
	res.json(await listCurrencies()),
)
regionalRoutes.get('/regional/settings', (req, res) =>
	res.json(
		localSettings(
			typeof req.query.country === 'string' ? req.query.country : undefined,
		),
	),
)
regionalRoutes.get('/regional/format-price', (req, res) => {
	const amount = Number(req.query.amount)
	const currency = z.string().length(3).safeParse(req.query.currency)
	if (!Number.isFinite(amount) || !currency.success)
		return res.status(400).json({ error: 'قيم التحويل غير صالحة' })
	return res.json({
		formatted: formatPrice(
			amount,
			currency.data,
			typeof req.query.locale === 'string' ? req.query.locale : 'ar-EG',
		),
	})
})
