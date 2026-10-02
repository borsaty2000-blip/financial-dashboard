import { CandlesService } from '../../server/src/services/market/candles.service.js'
import type { CandleMarket } from '../../server/src/services/market/candles.service.js'

const SYMBOLS: Record<'EGX' | 'TASI', string[]> = {
	EGX: ['COMI', 'ABUK', 'EAST', 'MFPC', 'SWDY', 'HRHO', 'TMGH', 'EKHO', 'FWRY', 'EFIH'],
	TASI: ['2222', '1010', '1120', '2010', '2350'],
}

export const refreshSymbols = Object.entries(SYMBOLS).flatMap(([market, symbols]) =>
	symbols.map((symbol) => ({ symbol, market: market as CandleMarket })),
)

export type RefreshResult = {
	symbol: string
	market: CandleMarket
	count?: number
	status: 'ok' | 'error'
	error?: string
}

export async function refreshDaily(): Promise<RefreshResult[]> {
	const results: RefreshResult[] = []
	for (const { symbol, market } of refreshSymbols) {
		try {
			const candles = await CandlesService.getCandles(symbol, market, '1d', 500)
			results.push({ symbol, market, count: candles.count, status: 'ok' })
		} catch (error) {
			results.push({
				symbol,
				market,
				status: 'error',
				error: error instanceof Error ? error.message : 'Unknown error',
			})
		}
		await new Promise((resolve) => setTimeout(resolve, 500))
	}
	return results
}

export default async function handler(req: any, res: any) {
	const configuredSecret = process.env.CRON_SECRET
	if (!configuredSecret) {
		console.warn('[cron] CRON_SECRET is not configured; refusing unauthenticated execution')
		return res.status(401).json({ error: 'Unauthorized' })
	}
	if (req.headers?.authorization !== `Bearer ${configuredSecret}`)
		return res.status(401).json({ error: 'Unauthorized' })

	const results = await refreshDaily()
	return res.status(200).json({
		status: 'success',
		executed_at: new Date().toISOString(),
		total: results.length,
		succeeded: results.filter((result) => result.status === 'ok').length,
		failed: results.filter((result) => result.status === 'error').length,
		results,
	})
}
