import { Router } from 'express'
import { CandlesService } from '../services/market/candles.service.js'

const catalog = [
	['COMI', 'البنك التجاري الدولي', 'EGX'],
	['ABUK', 'أبو قير للأسمدة', 'EGX'],
	['ETEL', 'المصرية للاتصالات', 'EGX'],
	['SWDY', 'السويدي إليكتريك', 'EGX'],
	['TMGH', 'طلعت مصطفى', 'EGX'],
	['ORAS', 'أوراسكوم كونستراكشون', 'EGX'],
	['MFPC', 'موبكو', 'EGX'],
	['EKHO', 'القابضة المصرية الكويتية', 'EGX'],
	['2222', 'أرامكو السعودية', 'TASI'],
	['1120', 'الراجحي', 'TASI'],
	['TASI', 'مؤشر السوق السعودي', 'TASI'],
	['XAUUSD', 'الذهب مقابل الدولار', 'GLOBAL'],
] as const
export const searchRoutes = Router()
function score(query: string, symbol: string, name: string) {
	const q = query.toLowerCase()
	const s = symbol.toLowerCase()
	const n = name.toLowerCase()
	return s === q
		? 100
		: s.startsWith(q)
			? 80
			: n.includes(q)
				? 60
				: s.includes(q)
					? 40
					: 0
}
searchRoutes.get('/', async (request, response) => {
	const query =
		typeof request.query.q === 'string' ? request.query.q.trim() : ''
	if (!query) return response.json([])
	const matches = catalog
		.map(([symbol, name, market]) => ({
			symbol,
			name,
			market,
			rank: score(query, symbol, name),
		}))
		.filter((item) => item.rank > 0)
		.sort((a, b) => b.rank - a.rank)
		.slice(0, 8)
	const results = await Promise.all(
		matches.map(async ({ rank: _rank, ...item }) => {
			const data = await CandlesService.getCandles(
				item.symbol,
				item.market,
				'1d',
				2,
			)
			const last = data.candles.at(-1)
			const previous = data.candles.at(-2)
			return {
				...item,
				price: last?.close ?? null,
				changePercent:
					last && previous
						? ((last.close - previous.close) / previous.close) * 100
						: null,
			}
		}),
	)
	response.json(results)
})
