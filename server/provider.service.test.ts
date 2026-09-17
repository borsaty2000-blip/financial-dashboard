import assert from 'node:assert/strict'
import test from 'node:test'
import {
	providerConfig,
	testProvider,
} from './src/services/market/provider.service.js'

test('provider config exposes configurable priorities and thresholds', () => {
	const config = providerConfig()
	assert.deepEqual(config.provider_priority.CRYPTO, [
		'binance',
		'twelve',
		'yahoo',
	])
	assert.equal(config.freshness_thresholds['1m'], 30)
})

test('crypto is live only with a fresh source timestamp', async () => {
	const originalFetch = globalThis.fetch
	globalThis.fetch = async () =>
		new Response(
			JSON.stringify({
				lastPrice: '100',
				closeTime: Date.now(),
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } },
		)
	try {
		const result = await testProvider('BTCUSDT', 'CRYPTO')
		assert.equal(result.provider_name, 'binance')
		assert.equal(result.data_quality.status, 'live')
		assert.equal(result.is_realtime, true)
		assert.equal(result.age_seconds !== null && result.age_seconds <= 30, true)
	} finally {
		globalThis.fetch = originalFetch
	}
})

test('missing realtime announcement cannot be classified as live', async () => {
	const originalFetch = globalThis.fetch
	globalThis.fetch = async () =>
		new Response(
			JSON.stringify({
				price: 100,
				timestamp: new Date().toISOString(),
			}),
			{ status: 200, headers: { 'content-type': 'application/json' } },
		)
	try {
		const result = await testProvider('COMI', 'EGX')
		assert.equal(result.provider_name, 'sahmk')
		assert.equal(result.data_quality.status, 'delayed')
		assert.equal(result.is_realtime, false)
		assert.match(result.data_quality.warnings.join(' '), /متأخر|realtime/)
	} finally {
		globalThis.fetch = originalFetch
	}
})
