type Fundamentals = {
	symbol: string
	incomeStatement: unknown[]
	balanceSheet: unknown[]
	cashFlow: unknown[]
	keyRatios: Record<string, unknown>
	dividendHistory: unknown[]
	earningsHistory: unknown[]
	source: string
	available: boolean
}
const cache = new Map<string, { expires: number; value: Fundamentals }>()
const ttl = 15 * 60_000
async function json(url: string, init?: RequestInit) {
	const result = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(10000),
	})
	if (!result.ok) throw new Error(`HTTP ${result.status}`)
	return result.json() as Promise<any>
}

export class FundamentalsService {
	static async getFundamentals(symbol: string): Promise<Fundamentals> {
		const normalized = symbol.toUpperCase()
		const cached = cache.get(normalized)
		if (cached && cached.expires > Date.now()) return cached.value
		const sources = [
			() => this.fromTwelveData(normalized),
			() => this.fromFinnhub(normalized),
			() => this.fromSahmk(normalized),
		]
		for (const source of sources) {
			try {
				const value = await source()
				if (value.available) {
					cache.set(normalized, { expires: Date.now() + ttl, value })
					return value
				}
			} catch (error) {
				console.warn(
					'Fundamentals source failed:',
					error instanceof Error ? error.message : error,
				)
			}
		}
		return {
			symbol: normalized,
			incomeStatement: [],
			balanceSheet: [],
			cashFlow: [],
			keyRatios: {},
			dividendHistory: [],
			earningsHistory: [],
			source: 'unavailable',
			available: false,
		}
	}
	static async getIncomeStatement(symbol: string) {
		return (await this.getFundamentals(symbol)).incomeStatement
	}
	static async getBalanceSheet(symbol: string) {
		return (await this.getFundamentals(symbol)).balanceSheet
	}
	static async getCashFlow(symbol: string) {
		return (await this.getFundamentals(symbol)).cashFlow
	}
	static async getKeyRatios(symbol: string) {
		return (await this.getFundamentals(symbol)).keyRatios
	}
	static async getDividendHistory(symbol: string) {
		return (await this.getFundamentals(symbol)).dividendHistory
	}
	static async getEarningsHistory(symbol: string) {
		return (await this.getFundamentals(symbol)).earningsHistory
	}
	private static async fromFinnhub(symbol: string): Promise<Fundamentals> {
		const token = process.env.FINNHUB_API_KEY
		if (!token) throw new Error('FINNHUB_API_KEY is not configured')
		const base = 'https://finnhub.io/api/v1'
		const query = `token=${encodeURIComponent(token)}&symbol=${encodeURIComponent(symbol)}`
		const [metric, reported, dividends, earnings] = await Promise.all([
			json(`${base}/stock/metric?${query}&metric=all`),
			json(`${base}/stock/financials-reported?${query}&freq=annual`),
			json(`${base}/stock/dividend?${query}&from=2015-01-01&to=2035-01-01`),
			json(`${base}/stock/earnings?${query}`),
		])
		const m = metric?.metric ?? {}
		const keyRatios = {
			marketCap: m.marketCapitalization,
			peRatio: m.peBasicExclExtraTTM ?? m.peTTM,
			eps: m.epsBasicExclExtraItemsTTM ?? m.epsTTM,
			dividendYield: m.dividendYieldIndicatedAnnual,
			fiftyTwoWeekHigh: m['52WeekHigh'],
			fiftyTwoWeekLow: m['52WeekLow'],
			bookValuePerShare: m.bookValuePerShareAnnual,
			priceToBook: m.pbAnnual,
			roe: m.roeTTM,
		}
		const reports = reported?.data ?? []
		return {
			symbol,
			incomeStatement: reports.map(
				(item: any) => item.report?.ic ?? item.report ?? item,
			),
			balanceSheet: reports.map((item: any) => item.report?.bs ?? []),
			cashFlow: reports.map((item: any) => item.report?.cf ?? []),
			keyRatios,
			dividendHistory: Array.isArray(dividends) ? dividends : [],
			earningsHistory: Array.isArray(earnings) ? earnings : [],
			source: 'Finnhub',
			available:
				Object.values(keyRatios).some(
					(value) => value !== undefined && value !== null,
				) || reports.length > 0,
		}
	}
	private static async fromSahmk(symbol: string): Promise<Fundamentals> {
		const key = process.env.SAHMK_API_KEY
		if (!key) throw new Error('SAHMK_API_KEY is not configured')
		const data = await json(
			`https://api.sahmk.sa/api/v1/fundamentals/${encodeURIComponent(symbol)}/`,
			{ headers: { 'X-API-Key': key } },
		)
		const fundamentals = data?.fundamentals ?? data
		return {
			symbol,
			incomeStatement: fundamentals?.income_statement ?? [],
			balanceSheet: fundamentals?.balance_sheet ?? [],
			cashFlow: fundamentals?.cash_flow ?? [],
			keyRatios: fundamentals ?? {},
			dividendHistory: data?.dividends ?? [],
			earningsHistory: data?.earnings ?? [],
			source: 'SAHMK',
			available: Boolean(fundamentals && Object.keys(fundamentals).length),
		}
	}
	private static async fromTwelveData(symbol: string): Promise<Fundamentals> {
		const key = process.env.TWELVE_DATA_API_KEY
		if (!key) throw new Error('TWELVE_DATA_API_KEY is not configured')
		const exchange = /^\d{4,5}$/u.test(symbol) ? 'SAU' : 'EGX'
		const data = await json(
			`https://api.twelvedata.com/statistics?symbol=${encodeURIComponent(symbol)}&exchange=${exchange}&apikey=${encodeURIComponent(key)}`,
		)
		const stats = data?.statistics ?? data
		const valuations = stats?.valuations_metrics ?? {}
		const financials = stats?.financials ?? {}
		const incomeStatement = financials?.income_statement ?? {}
		const dividends = stats?.dividends_and_splits ?? stats?.dividends ?? {}
		const first = (...values: unknown[]) =>
			values.find(
				(value) => value !== undefined && value !== null && value !== '',
			)
		const keyRatios = {
			...valuations,
			peRatio: first(valuations.pe_ratio, valuations.peRatio),
			marketCap: first(valuations.market_capitalization, valuations.market_cap),
			eps: first(
				incomeStatement.eps,
				incomeStatement.basic_eps,
				stats?.financials?.income_statement?.eps,
			),
			dividendYield: first(
				dividends.forward_annual_dividend_yield,
				dividends.dividend_yield,
			),
		}
		return {
			symbol,
			incomeStatement: Array.isArray(incomeStatement)
				? incomeStatement
				: [incomeStatement],
			balanceSheet: stats?.financials?.balance_sheet ?? [],
			cashFlow: stats?.financials?.cash_flow ?? [],
			keyRatios,
			dividendHistory: stats?.dividends ?? [],
			earningsHistory: stats?.earnings ?? [],
			source: 'Twelve Data',
			available: Boolean(
				stats &&
				Object.values(keyRatios).some(
					(value) => value !== undefined && value !== null && value !== '',
				),
			),
		}
	}
}
