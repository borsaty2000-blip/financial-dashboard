const catalog = [
	['BRENT', 'نفط برنت', 'energy', 'USD'],
	['WTI', 'نفط خام', 'energy', 'USD'],
	['NATURAL_GAS', 'غاز طبيعي', 'energy', 'USD'],
	['GASOLINE', 'بنزين', 'energy', 'USD'],
	['COPPER', 'نحاس', 'metals', 'USD'],
	['ALUMINUM', 'ألومنيوم', 'metals', 'USD'],
	['IRON_ORE', 'حديد', 'metals', 'USD'],
	['WHEAT', 'قمح', 'agriculture', 'USD'],
	['CORN', 'ذرة', 'agriculture', 'USD'],
	['COTTON', 'قطن', 'agriculture', 'USD'],
	['SUGAR', 'سكر', 'agriculture', 'USD'],
	['XAU/USD', 'ذهب', 'precious', 'USD'],
	['XAG/USD', 'فضة', 'precious', 'USD'],
	['XPT/USD', 'بلاتين', 'precious', 'USD'],
	['XPD/USD', 'بلاديوم', 'precious', 'USD'],
] as const
async function quote(symbol: string) {
	const key = process.env.TWELVE_DATA_API_KEY
	if (!key) return null
	const response = await fetch(
		`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(key)}`,
		{ signal: AbortSignal.timeout(8000) },
	)
	if (!response.ok) return null
	const data = (await response.json()) as any
	const price = Number(data?.close)
	return Number.isFinite(price)
		? {
				price,
				changePercent: Number(data?.percent_change) || null,
				updatedAt: data?.datetime ?? null,
				source: 'Twelve Data Pro',
			}
		: null
}
export class CommoditiesService {
	static list() {
		return catalog.map(([symbol, name, category, currency]) => ({
			symbol,
			name,
			category,
			currency,
		}))
	}
	static async getQuote(symbol: string) {
		const item = catalog.find(([value]) => value === symbol.toUpperCase())
		if (!item) return { available: false, symbol }
		const live = await quote(item[0]).catch(() => null)
		return {
			symbol: item[0],
			name: item[1],
			category: item[2],
			currency: item[3],
			...live,
			available: Boolean(live),
		}
	}
}
