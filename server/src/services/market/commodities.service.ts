import { getYahooQuote } from './yahoo.adapter.js'

export type CommoditySource = 'yahoo' | 'twelvedata' | 'finnhub' | 'metals'
export type CommodityCategory = 'energy' | 'metals' | 'agriculture' | 'precious'

export interface CommodityMapping {
	symbol: string
	source: CommoditySource
	sourceSymbol: string
	nameAr: string
	category: CommodityCategory
	currency: 'USD'
}

type CommodityQuote = {
	price: number
	changePercent: number | null
	updatedAt: string | null
	source: string
}

export const COMMODITIES: CommodityMapping[] = [
	{
		symbol: 'WTI',
		source: 'yahoo',
		sourceSymbol: 'CL=F',
		nameAr: 'نفط خام',
		category: 'energy',
		currency: 'USD',
	},
	{
		symbol: 'BRENT',
		source: 'yahoo',
		sourceSymbol: 'BZ=F',
		nameAr: 'نفط برنت',
		category: 'energy',
		currency: 'USD',
	},
	{
		symbol: 'NATURAL_GAS',
		source: 'yahoo',
		sourceSymbol: 'NG=F',
		nameAr: 'غاز طبيعي',
		category: 'energy',
		currency: 'USD',
	},
	{
		symbol: 'GASOLINE',
		source: 'yahoo',
		sourceSymbol: 'RB=F',
		nameAr: 'بنزين',
		category: 'energy',
		currency: 'USD',
	},
	{
		symbol: 'COPPER',
		source: 'yahoo',
		sourceSymbol: 'HG=F',
		nameAr: 'نحاس',
		category: 'metals',
		currency: 'USD',
	},
	{
		symbol: 'ALUMINUM',
		source: 'twelvedata',
		sourceSymbol: 'ALUMINUM',
		nameAr: 'ألومنيوم',
		category: 'metals',
		currency: 'USD',
	},
	{
		symbol: 'IRON_ORE',
		source: 'twelvedata',
		sourceSymbol: 'IRON',
		nameAr: 'حديد',
		category: 'metals',
		currency: 'USD',
	},
	{
		symbol: 'CORN',
		source: 'yahoo',
		sourceSymbol: 'ZC=F',
		nameAr: 'ذرة',
		category: 'agriculture',
		currency: 'USD',
	},
	{
		symbol: 'WHEAT',
		source: 'yahoo',
		sourceSymbol: 'ZW=F',
		nameAr: 'قمح',
		category: 'agriculture',
		currency: 'USD',
	},
	{
		symbol: 'SUGAR',
		source: 'yahoo',
		sourceSymbol: 'SB=F',
		nameAr: 'سكر',
		category: 'agriculture',
		currency: 'USD',
	},
	{
		symbol: 'COTTON',
		source: 'yahoo',
		sourceSymbol: 'CT=F',
		nameAr: 'قطن',
		category: 'agriculture',
		currency: 'USD',
	},
	{
		symbol: 'XAU/USD',
		source: 'finnhub',
		sourceSymbol: 'OANDA:XAU_USD',
		nameAr: 'ذهب',
		category: 'precious',
		currency: 'USD',
	},
	{
		symbol: 'XAG/USD',
		source: 'finnhub',
		sourceSymbol: 'OANDA:XAG_USD',
		nameAr: 'فضة',
		category: 'precious',
		currency: 'USD',
	},
	{
		symbol: 'XPT/USD',
		source: 'finnhub',
		sourceSymbol: 'OANDA:XPT_USD',
		nameAr: 'بلاتين',
		category: 'precious',
		currency: 'USD',
	},
	{
		symbol: 'XPD/USD',
		source: 'finnhub',
		sourceSymbol: 'OANDA:XPD_USD',
		nameAr: 'بلاديوم',
		category: 'precious',
		currency: 'USD',
	},
]

function finiteNumber(value: unknown): number | null {
	const number = Number(value)
	return Number.isFinite(number) && number > 0 ? number : null
}

async function twelveDataQuote(symbol: string): Promise<CommodityQuote> {
	const key = process.env.TWELVE_DATA_API_KEY?.trim()
	if (!key) throw new Error('TWELVE_DATA_API_KEY is not configured')
	const response = await fetch(
		`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
		{ signal: AbortSignal.timeout(8_000) },
	)
	if (!response.ok) throw new Error(`Twelve Data HTTP ${response.status}`)
	const data = (await response.json()) as Record<string, unknown>
	const price = finiteNumber(data.close ?? data.price)
	if (price == null) throw new Error('Twelve Data quote has no price')
	const percent = Number(data.percent_change)
	return {
		price,
		changePercent: Number.isFinite(percent) ? percent : null,
		updatedAt: typeof data.datetime === 'string' ? data.datetime : null,
		source: 'Twelve Data',
	}
}

async function finnhubQuote(symbol: string): Promise<CommodityQuote> {
	const key = process.env.FINNHUB_API_KEY?.trim()
	if (!key) throw new Error('FINNHUB_API_KEY is not configured')
	const response = await fetch(
		`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(key)}`,
		{ signal: AbortSignal.timeout(8_000) },
	)
	if (!response.ok) throw new Error(`Finnhub HTTP ${response.status}`)
	const data = (await response.json()) as Record<string, unknown>
	const price = finiteNumber(data.c)
	if (price == null) throw new Error('Finnhub quote has no price')
	const percent = Number(data.dp)
	const timestamp = Number(data.t)
	return {
		price,
		changePercent: Number.isFinite(percent) ? percent : null,
		updatedAt: Number.isFinite(timestamp)
			? new Date(timestamp * 1_000).toISOString()
			: null,
		source: 'Finnhub',
	}
}

async function yahooQuote(symbol: string): Promise<CommodityQuote> {
	const quote = await getYahooQuote(symbol)
	return {
		price: quote.value,
		changePercent: quote.changePercent,
		updatedAt: quote.updatedAt,
		source: 'Yahoo Finance',
	}
}

async function fetchQuote(item: CommodityMapping): Promise<CommodityQuote> {
	if (item.source === 'yahoo') return yahooQuote(item.sourceSymbol)
	if (item.source === 'finnhub') return finnhubQuote(item.sourceSymbol)
	if (item.source === 'twelvedata') return twelveDataQuote(item.sourceSymbol)
	return twelveDataQuote(item.sourceSymbol)
}

function withMetadata(
	item: CommodityMapping,
	quote?: CommodityQuote,
	error?: unknown,
) {
	return {
		symbol: item.symbol,
		name: item.nameAr,
		nameAr: item.nameAr,
		category: item.category,
		currency: item.currency,
		sourceSymbol: item.sourceSymbol,
		configuredSource: item.source,
		...(quote ?? {}),
		available: Boolean(quote),
		...(error && !quote
			? { error: error instanceof Error ? error.message : 'Quote unavailable' }
			: {}),
	}
}

export class CommoditiesService {
	static list() {
		return COMMODITIES.map((item) => withMetadata(item))
	}

	static async getQuote(symbol: string) {
		const item = COMMODITIES.find(
			(value) => value.symbol.toUpperCase() === symbol.toUpperCase(),
		)
		if (!item) return { available: false, symbol }
		try {
			return withMetadata(item, await fetchQuote(item))
		} catch (error) {
			return withMetadata(item, undefined, error)
		}
	}

	static async listWithQuotes() {
		return Promise.all(COMMODITIES.map((item) => this.getQuote(item.symbol)))
	}
}
