import { Router } from 'express'
import {
	getInsiderTrades,
	getOwnership,
} from '../services/governance/governance.service.js'
export const governanceRoutes = Router()
governanceRoutes.get('/insider-trades/recent', async (_req, res) =>
	res.json({
		data: await getInsiderTrades(),
		count: (await getInsiderTrades()).length,
	}),
)
governanceRoutes.get('/insider-trades/:symbol', async (req, res) => {
	const data = await getInsiderTrades(req.params.symbol)
	return res.json({ data, count: data.length })
})
governanceRoutes.get('/ownership/:symbol', async (req, res) =>
	res.json(await getOwnership(req.params.symbol)),
)
