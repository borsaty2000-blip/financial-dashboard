import { CandlesService, type CandleMarket } from '../market/candles.service.js'

function within(date: string, start?: string, end?: string) {
	const time = Date.parse(date)
	return (
		Number.isFinite(time) &&
		(!start || time >= Date.parse(start)) &&
		(!end || time <= Date.parse(end))
	)
}

export async function simulateInvestment(
	symbol: string,
	amount: number,
	startDate?: string,
	endDate?: string,
	market: CandleMarket = 'EGX',
) {
	if (!Number.isFinite(amount) || amount <= 0)
		throw new Error('amount must be positive')
	const result = await CandlesService.getCandles(symbol, market, '1d', 500)
	const candles = result.candles.filter((candle) =>
		within(candle.date, startDate, endDate),
	)
	const first = candles[0]
	const last = candles.at(-1)
	if (!first || !last || first.close <= 0)
		throw new Error('لا توجد بيانات تاريخية للفترة المحددة')
	const quantity = amount / first.close
	const finalValue = quantity * last.close
	const profit = finalValue - amount
	return {
		symbol: symbol.toUpperCase(),
		amount,
		startDate: first.date,
		endDate: last.date,
		startPrice: first.close,
		endPrice: last.close,
		quantity,
		finalValue,
		profit,
		returnPercent: (profit / amount) * 100,
		equityCurve: candles.map((candle) => ({
			date: candle.date,
			value: quantity * candle.close,
		})),
		available: true,
		source: result.source,
		disclaimer:
			'محاكاة تاريخية تعليمية، ولا تشمل العمولات أو الضرائب أو الانزلاق السعري.',
	}
}

export async function compareInvestments(
	symbols: string[],
	amount: number,
	period = 365,
) {
	const end = new Date().toISOString().slice(0, 10)
	const start = new Date(Date.now() - period * 86400000)
		.toISOString()
		.slice(0, 10)
	return Promise.all(
		symbols
			.slice(0, 8)
			.map((symbol) => simulateInvestment(symbol, amount, start, end)),
	)
}

export async function whatIfScenario(scenario: {
	symbol: string
	amount: number
	startDate?: string
	endDate?: string
}) {
	return simulateInvestment(
		scenario.symbol,
		scenario.amount,
		scenario.startDate,
		scenario.endDate,
	)
}
