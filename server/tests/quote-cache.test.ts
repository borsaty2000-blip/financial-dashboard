import assert from 'node:assert/strict'
import test from 'node:test'
import { CandlesService } from '../src/services/market/candles.service.js'

test('quote cache reuses a validated intraday quote until invalidated', async () => {
	const originalFetch = globalThis.fetch
	const originalTwelve = process.env.TWELVE_DATA_API_KEY
	const originalPolygon = process.env.POLYGON_API_KEY
	delete process.env.TWELVE_DATA_API_KEY
	delete process.env.POLYGON_API_KEY
	let calls = 0
	const timestamp = Math.floor(Date.now() / 1000) - 60
	globalThis.fetch = async () => {
		calls += 1
		return new Response(JSON.stringify({
			chart: {
				result: [{
					timestamp: [timestamp - 300, timestamp],
					indicators: { quote: [{ close: [89.5, 90.5] }] },
					meta: { chartPreviousClose: 88.5 },
				}],
			},
		}), { status: 200, headers: { 'content-type': 'application/json' } })
	}

	try {
		CandlesService.invalidateQuoteCache('ABUK', 'EGX')
		const first = await CandlesService.getQuote('ABUK', 'EGX')
		const second = await CandlesService.getQuote('ABUK', 'EGX')
		assert.equal(first.price, 90.5)
		assert.equal(first.changePercent, ((90.5 - 88.5) / 88.5) * 100)
		assert.equal(second.price, first.price)
		assert.equal(calls, 1)

		CandlesService.invalidateQuoteCache('ABUK', 'EGX')
		const refreshed = await CandlesService.getQuote('ABUK', 'EGX')
		assert.equal(refreshed.price, 90.5)
		assert.equal(calls, 2)
	} finally {
		globalThis.fetch = originalFetch
		if (originalTwelve === undefined) delete process.env.TWELVE_DATA_API_KEY
		else process.env.TWELVE_DATA_API_KEY = originalTwelve
		if (originalPolygon === undefined) delete process.env.POLYGON_API_KEY
		else process.env.POLYGON_API_KEY = originalPolygon
		CandlesService.invalidateQuoteCache()
	}
})

test('quote cache uses a separate key for each market', async () => {
	CandlesService.invalidateQuoteCache()
	assert.doesNotThrow(() => CandlesService.invalidateQuoteCache('ABUK', 'EGX'))
	assert.doesNotThrow(() => CandlesService.invalidateQuoteCache('ABUK', 'TASI'))
})

test('quote uses a fresh Yahoo daily close before database fallback', async () => {
	const originalFetch = globalThis.fetch
	const originalTwelve = process.env.TWELVE_DATA_API_KEY
	const originalPolygon = process.env.POLYGON_API_KEY
	delete process.env.TWELVE_DATA_API_KEY
	delete process.env.POLYGON_API_KEY
	let calls = 0
	const timestamp = Math.floor(Date.now() / 1000) - 300
	globalThis.fetch = async (input) => {
		calls += 1
		const url = String(input)
		const isIntraday = url.includes('interval=5m')
		return new Response(JSON.stringify({
			chart: {
				result: [{
					timestamp: isIntraday ? [] : [timestamp],
					indicators: { quote: [{ close: isIntraday ? [] : [91.25] }] },
					meta: { chartPreviousClose: 90.25 },
				}],
			},
		}), { status: 200, headers: { 'content-type': 'application/json' } })
	}

	try {
		CandlesService.invalidateQuoteCache('ABUK', 'EGX')
		const quote = await CandlesService.getQuote('ABUK', 'EGX')
		assert.equal(quote.price, 91.25)
		assert.equal(quote.changePercent, ((91.25 - 90.25) / 90.25) * 100)
		assert.equal(calls, 2)
	} finally {
		globalThis.fetch = originalFetch
		if (originalTwelve === undefined) delete process.env.TWELVE_DATA_API_KEY
		else process.env.TWELVE_DATA_API_KEY = originalTwelve
		if (originalPolygon === undefined) delete process.env.POLYGON_API_KEY
		else process.env.POLYGON_API_KEY = originalPolygon
		CandlesService.invalidateQuoteCache()
	}
})

test('force refresh refuses an old Yahoo close and database fallback', async () => {
	const originalFetch = globalThis.fetch
	const originalTwelve = process.env.TWELVE_DATA_API_KEY
	const originalPolygon = process.env.POLYGON_API_KEY
	delete process.env.TWELVE_DATA_API_KEY
	delete process.env.POLYGON_API_KEY
	const oldTimestamp = Math.floor(Date.now() / 1000) - 3 * 86400
	globalThis.fetch = async () => new Response(JSON.stringify({
		chart: {
			result: [{
				timestamp: [oldTimestamp],
				indicators: { quote: [{ close: [86.5] }] },
				meta: { chartPreviousClose: 86.0 },
			}],
		},
	}), { status: 200, headers: { 'content-type': 'application/json' } })

	try {
		CandlesService.invalidateQuoteCache('ABUK', 'EGX')
		const quote = await CandlesService.getQuote('ABUK', 'EGX', { force: true })
		assert.equal(quote.price, null)
		assert.equal(quote.data_quality.status, 'unavailable')
	} finally {
		globalThis.fetch = originalFetch
		if (originalTwelve === undefined) delete process.env.TWELVE_DATA_API_KEY
		else process.env.TWELVE_DATA_API_KEY = originalTwelve
		if (originalPolygon === undefined) delete process.env.POLYGON_API_KEY
		else process.env.POLYGON_API_KEY = originalPolygon
		CandlesService.invalidateQuoteCache()
	}
})
