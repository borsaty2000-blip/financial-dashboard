import type { Candle } from './candles.service.js'

const text = (value: string) =>
	value
		.replace(/<[^>]*>/g, '')
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/\\/g, '')
		.trim()

const numberValue = (value: string) => {
	const parsed = Number(text(value).replace(/,/g, ''))
	return Number.isFinite(parsed) ? parsed : null
}

export function parseStockAnalysisHistory(html: string, days: number): Candle[] {
	const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) ?? []
	return rows
		.map((row) => {
			const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) => text(m[1]))
			if (cells.length < 7) return null
			const parsedDate = new Date(cells[0])
			const open = numberValue(cells[1])
			const high = numberValue(cells[2])
			const low = numberValue(cells[3])
			const close = numberValue(cells[4])
			const volume = numberValue(cells[6])
			if (Number.isNaN(parsedDate.getTime()) || open == null || high == null || low == null || close == null)
				return null
			return {
				date: parsedDate.toISOString().slice(0, 10),
				open,
				high,
				low,
				close,
				volume: volume ?? 0,
			}
		})
		.filter((candle): candle is Candle => candle !== null)
		.reverse()
		.slice(-days)
}

export async function fetchStockAnalysisCandles(symbol: string, days = 250): Promise<Candle[]> {
	const url = `https://stockanalysis.com/quote/egx/${encodeURIComponent(symbol)}/history/`
	const result = await fetch(url, {
		headers: { accept: 'text/html', 'user-agent': 'BorsatyAI/1.0 (+https://borsatyai.com)' },
		signal: AbortSignal.timeout(12000),
	})
	if (!result.ok) throw new Error(`StockAnalysis HTTP ${result.status}`)
	const candles = parseStockAnalysisHistory(await result.text(), days)
	if (!candles.length) throw new Error('No StockAnalysis history')
	return candles
}

export const STOCK_ANALYSIS_PROVIDER = 'StockAnalysis / S&P Global MI'
export const STOCK_ANALYSIS_WARNING = 'بيانات يومية متأخرة؛ المصدر المعلن S&P Global Market Intelligence.'
export const STOCK_ANALYSIS_URL = 'https://stockanalysis.com/data-sources/'

export const stockAnalysis = {
	fetch: fetchStockAnalysisCandles,
	parse: parseStockAnalysisHistory,
	provider: STOCK_ANALYSIS_PROVIDER,
	warning: STOCK_ANALYSIS_WARNING,
	url: STOCK_ANALYSIS_URL,
}

export default stockAnalysis
