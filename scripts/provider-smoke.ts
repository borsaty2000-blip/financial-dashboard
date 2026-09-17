import { testProvider } from '../server/src/services/market/provider.service.js'

for (const [symbol, market] of [
	['COMI', 'EGX'],
	['1010', 'TASI'],
	['BTCUSDT', 'CRYPTO'],
] as const) {
	const result = await testProvider(symbol, market)
	console.log(
		JSON.stringify({
			symbol,
			market,
			provider: result.provider_name,
			status: result.data_quality.status,
			realtime: result.is_realtime,
			coverage: result.coverage_confirmed,
			age: result.age_seconds,
			warnings: result.data_quality.warnings,
		}),
	)
}
