import assert from 'node:assert/strict'
import test from 'node:test'

test('Saudi directory falls back to Twelve Data EOD without claiming live data', async () => {
	process.env.TWELVE_DATA_API_KEY = 'test-key'
	delete process.env.SAHMK_API_KEY
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (input) => {
		const url = String(input)
		if (url.includes('api.sahmk.sa'))
			return new Response(JSON.stringify({ error: 'unavailable' }), {
				status: 503,
				headers: { 'content-type': 'application/json' },
			})
		if (url.includes('exchange=XSAU'))
			return new Response(
				JSON.stringify({
					data: [
						{
							symbol: '2222',
							name: 'Saudi Aramco',
							currency: 'SAR',
							exchange: 'Tadawul',
						},
					],
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			)
		throw new Error(`unexpected URL in contract test: ${url}`)
	}

	try {
		const { clearTwelveDirectoryCacheForTest } =
			await import('./src/services/market/twelve-data.adapter.js')
		const { getTasiCompanies } =
			await import('./src/services/market/sahmk.adapter.js')
		clearTwelveDirectoryCacheForTest()
		const envelope = await getTasiCompanies()
		assert.equal(envelope.source, 'Twelve Data')
		assert.equal(envelope.freshness, 'delayed')
		assert.equal(envelope.delay_minutes, 1440)
		assert.equal(envelope.available, true)
		assert.deepEqual(envelope.data, [
			{
				symbol: '2222',
				name: 'Saudi Aramco',
				currency: 'SAR',
				exchange: 'Tadawul',
				micCode: null,
				country: null,
				type: null,
				figiCode: null,
			},
		])
	} finally {
		globalThis.fetch = originalFetch
	}
})
