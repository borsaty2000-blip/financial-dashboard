const base = 'https://api.coingecko.com/api/v3'
async function json(path: string) {
	const response = await fetch(`${base}${path}`, {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(10000),
	})
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	return response.json() as Promise<any>
}
export class CryptoService {
	static async list(limit = 50) {
		try {
			const data = await json(
				`/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${Math.min(limit, 50)}&page=1&sparkline=true&price_change_percentage=24h,7d`,
			)
			return { data, count: data.length, source: 'CoinGecko', available: true }
		} catch {
			return { data: [], count: 0, source: 'unavailable', available: false }
		}
	}
	static async get(symbol: string) {
		const id = symbol.toLowerCase()
		try {
			const data = await json(
				`/coins/${encodeURIComponent(id)}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false`,
			)
			return {
				symbol: data.symbol,
				name: data.name,
				price: data.market_data?.current_price?.usd ?? null,
				marketCap: data.market_data?.market_cap?.usd ?? null,
				changePercent: data.market_data?.price_change_percentage_24h ?? null,
				history: data.market_data?.sparkline_7d?.price ?? [],
				source: 'CoinGecko',
				available: true,
			}
		} catch {
			return {
				symbol,
				price: null,
				marketCap: null,
				changePercent: null,
				history: [],
				source: 'unavailable',
				available: false,
			}
		}
	}
}
