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
		if (url.includes('exchange=XCAI'))
			return new Response(
				JSON.stringify({
					data: [
						{
							symbol: 'EGS60121C018',
							name: 'Commercial International Bank (Egypt) S.A.E.',
							currency: 'EGP',
							exchange: 'EGX',
						},
					],
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			)
		throw new Error(`unexpected URL in contract test: ${url}`)
	}

	try {
		const { clearTwelveDirectoryCacheForTest, getEgyptCompanies } =
			await import('./src/services/market/twelve-data.adapter.js')
		const { getTasiCompanies } =
			await import('./src/services/market/sahmk.adapter.js')
		clearTwelveDirectoryCacheForTest()
		const envelope = await getTasiCompanies()
		assert.equal(envelope.source, 'Twelve Data')
		assert.equal(envelope.freshness, 'delayed')
		assert.equal(envelope.delay_minutes, 1440)
		assert.equal(envelope.available, true)
		assert.ok(Array.isArray(envelope.data))
		assert.ok(
			(envelope.data as Array<{ symbol: string }>).some(
				(company) => company.symbol === '2222',
			),
		)
		clearTwelveDirectoryCacheForTest()
		const egypt = await getEgyptCompanies()
		assert.ok(egypt.length >= 145)
		assert.ok(egypt.some((company) => company.symbol === 'COMI'))
	} finally {
		globalThis.fetch = originalFetch
	}
})

test('live directory enrichment only changes rows with a returned quote', async () => {
	const { mergeQuotes } = await import('./src/routes/live-market.routes.js')
	const companies = [
		{
			symbol: 'EGS60121C018',
			displaySymbol: 'COMI',
			name: 'Commercial International Bank',
			price: null,
			available: false,
		},
		{
			symbol: 'EGS00000C000',
			name: 'Unavailable Example',
			price: null,
			available: false,
		},
	]
	const result = mergeQuotes(companies, [
		{
			symbol: 'EGS60121C018',
			price: 42.5,
			changePercent: 1.25,
			freshness: 'delayed',
		},
	])

	assert.equal((result[0] as Record<string, unknown>).price, 42.5)
	assert.equal((result[0] as Record<string, unknown>).available, true)
	assert.equal((result[1] as Record<string, unknown>).price, null)
	assert.equal((result[1] as Record<string, unknown>).available, false)
})

test('Egyptian ISIN resolves to the mapped provider symbol', async () => {
	process.env.TWELVE_DATA_API_KEY = 'test-key'
	const originalFetch = globalThis.fetch
	globalThis.fetch = async (input) => {
		const url = String(input)
		if (url.includes('exchange=XCAI'))
			return new Response(
				JSON.stringify({
					data: [
						{
							symbol: 'EGS38191C010',
							name: 'Abu Qir Fertilizers and Chemical Industries',
							currency: 'EGP',
							exchange: 'EGX',
						},
					],
				}),
				{ status: 200, headers: { 'content-type': 'application/json' } },
			)
		throw new Error(`unexpected URL in resolver test: ${url}`)
	}

	try {
		const { clearTwelveDirectoryCacheForTest, resolveEgyptSymbol } =
			await import('./src/services/market/twelve-data.adapter.js')
		clearTwelveDirectoryCacheForTest()
		assert.equal(await resolveEgyptSymbol('EGS38191C010'), 'ABUK')
	} finally {
		globalThis.fetch = originalFetch
	}
})
