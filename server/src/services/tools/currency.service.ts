async function json(url: string) {
	const response = await fetch(url, { signal: AbortSignal.timeout(8000) })
	if (!response.ok) throw new Error(`HTTP ${response.status}`)
	return response.json() as Promise<any>
}
export class CurrencyService {
	static async getRates(base = 'EGP') {
		const data = await json(
			`https://api.frankfurter.app/latest?from=${encodeURIComponent(base.toUpperCase())}`,
		)
		return {
			base: base.toUpperCase(),
			rates: data.rates,
			date: data.date,
			source: 'Frankfurter',
			available: true,
		}
	}
	static async convert(from: string, to: string, amount: number) {
		const data = await this.getRates(from)
		const rate = Number(data.rates[to.toUpperCase()])
		if (!Number.isFinite(rate)) throw new Error('العملة غير متاحة')
		return {
			from: from.toUpperCase(),
			to: to.toUpperCase(),
			amount,
			rate,
			result: amount * rate,
			date: data.date,
			source: data.source,
		}
	}
	static async getHistoricalRate(from: string, to: string, date: string) {
		const data = await json(
			`https://api.frankfurter.app/${date}?from=${from.toUpperCase()}&to=${to.toUpperCase()}`,
		)
		return {
			from: from.toUpperCase(),
			to: to.toUpperCase(),
			rate: data.rates?.[to.toUpperCase()] ?? null,
			date,
			available: Boolean(data.rates?.[to.toUpperCase()]),
		}
	}
}
