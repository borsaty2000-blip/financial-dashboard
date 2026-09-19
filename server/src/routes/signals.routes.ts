import { Router } from 'express'
import { Prisma } from '@prisma/client'
import { prisma } from '../lib/prisma.js'

export const signalsRoutes = Router()

signalsRoutes.get('/signals', async (request, response) => {
	const symbol = typeof request.query.symbol === 'string' ? request.query.symbol.toUpperCase() : null
	const status = typeof request.query.status === 'string' ? request.query.status.toUpperCase() : null
	try {
		const rows = await prisma.$queryRaw(Prisma.sql`
			SELECT id, symbol, market, timeframe, "signalType", "entryPrice", "stopLoss", "target1", "target2", "target3", confluence, reason, status, "createdAt", "resolvedAt", outcome, "pnlPercent"
			FROM "signals"
			WHERE (${symbol}::text IS NULL OR symbol = ${symbol})
			  AND (${status}::text IS NULL OR status = ${status})
			ORDER BY "createdAt" DESC LIMIT 100
		`)
		return response.json({ status: 'success', count: (rows as unknown[]).length, items: rows, data_quality: { status: 'historical', provider: 'signals-history', timestamp: new Date().toISOString(), is_delayed: false } })
	} catch {
		return response.status(503).json({ status: 'unavailable', items: [], message: 'Signal history database is unavailable' })
	}
})
