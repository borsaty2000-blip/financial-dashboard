import { describe, expect, it } from 'vitest'

const configured = (key: string) => Boolean(process.env[key]?.trim())
const hasProviderCredentials = [
	'TWELVE_DATA_API_KEY',
	'SAHMK_API_KEY',
	'FINNHUB_API_KEY',
].every(configured)

async function request(url: string, init?: RequestInit) {
	const response = await fetch(url, {
		...init,
		signal: AbortSignal.timeout(10_000),
	})
	return {
		response,
		body: (await response.json().catch(() => null)) as unknown,
	}
}

describe.runIf(hasProviderCredentials)(
	'live market provider credentials',
	() => {
		it('receives all configured provider keys in the test environment', () => {
			expect(configured('TWELVE_DATA_API_KEY')).toBe(true)
			expect(configured('SAHMK_API_KEY')).toBe(true)
			expect(configured('FINNHUB_API_KEY')).toBe(true)
		})

		it('validates a lightweight Twelve Data precious-metal quote', async () => {
			const { response, body } = await request(
				`https://api.twelvedata.com/quote?symbol=XAU%2FUSD&apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY!)}`,
			)
			expect(response.ok).toBe(true)
			expect(body).toEqual(
				expect.objectContaining({
					symbol: expect.any(String),
					close: expect.any(String),
				}),
			)
		})

		it('validates Twelve Data access to the Egyptian Exchange symbol directory', async () => {
			const { response, body } = await request(
				`https://api.twelvedata.com/stocks?exchange=XCAI&apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY!)}`,
			)
			expect(response.ok).toBe(true)
			expect(body).toEqual(expect.objectContaining({ data: expect.any(Array) }))
		})

		it('validates the public Yahoo delayed fallback for COMI historical data', async () => {
			const { response, body } = await request(
				'https://query1.finance.yahoo.com/v8/finance/chart/COMI.CA?range=5d&interval=1d',
			)
			expect(response.ok).toBe(true)
			expect(body).toEqual(
				expect.objectContaining({
					chart: expect.objectContaining({ result: expect.any(Array) }),
				}),
			)
		})

		it('validates a lightweight SAHMK TASI market summary', async () => {
			const { response, body } = await request(
				'https://api.sahmk.sa/api/v1/market/summary/?index=TASI',
				{ headers: { 'X-API-Key': process.env.SAHMK_API_KEY! } },
			)
			expect(response.ok).toBe(true)
			expect(body).toEqual(
				expect.objectContaining({ index: expect.any(String) }),
			)
		})

		it('validates a lightweight Finnhub quote', async () => {
			const { response, body } = await request(
				`https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(process.env.FINNHUB_API_KEY!)}`,
			)
			expect(response.ok).toBe(true)
			expect(body).toEqual(
				expect.objectContaining({
					c: expect.any(Number),
					t: expect.any(Number),
				}),
			)
		})
	},
)
