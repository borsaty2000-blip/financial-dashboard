import { Router } from 'express'
import { companies, quotes } from './live-market.routes.js'

const heatmapRoutes = Router()

heatmapRoutes.get('/heatmap', async (request, response) => {
	const market = request.query.market === 'TASI' ? 'TASI' : 'EGX'
	try {
		const directory = await companies()
		const rows = market === 'TASI' ? directory.tasi : directory.egx
		const symbols = rows
			.slice(0, 40)
			.map((row) =>
				row && typeof row === 'object'
					? String((row as Record<string, unknown>).symbol ?? '')
					: '',
			)
			.filter(Boolean)
		const quoteRows = await quotes(symbols, market)
		const bySymbol = new Map(quoteRows.map((quote) => [quote.symbol, quote]))
		const stocks = rows
			.map((row) => {
				if (!row || typeof row !== 'object') return null
				const item = row as Record<string, unknown>
				const quote = bySymbol.get(String(item.symbol ?? ''))
				if (!quote) return null
				return {
					symbol: item.displaySymbol ?? item.symbol,
					canonicalSymbol: item.symbol,
					name: item.name ?? 'غير معروف',
					price: quote.price,
					changePercent: quote.changePercent,
					available: true,
					freshness: quote.freshness,
				}
			})
			.filter((item): item is NonNullable<typeof item> => item !== null)
		const sectors: Record<string, { count: number; avgChange: number | null }> =
			{}
		return response.json({
			status: 'success',
			market,
			stocks,
			sectors,
			coverage: { requested: symbols.length, available: stocks.length },
			note: 'تظهر الخريطة الأسهم التي أعادت سعراً وتغيراً متاحين فقط؛ لا تمثل الأسهم غير المتاحة صفراً أو تغيراً مفترضاً.',
		})
	} catch {
		return response.status(503).json({
			status: 'unavailable',
			market,
			stocks: [],
			sectors: {},
			message: 'خريطة السوق غير متاحة حالياً',
		})
	}
})

export { heatmapRoutes }
