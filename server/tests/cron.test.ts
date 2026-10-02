import assert from 'node:assert/strict'
import test from 'node:test'
import handler, { refreshDaily, refreshSymbols } from '../../api/cron/refresh-daily.js'
import { CandlesService } from '../src/services/market/candles.service.js'

const response = () => {
	const value: { statusCode?: number; body?: unknown } = {}
	return {
		value,
		status(code: number) { value.statusCode = code; return this },
		json(body: unknown) { value.body = body; return this },
	}
}

const runWithoutDelay = async <T>(work: () => Promise<T>) => {
	const original = globalThis.setTimeout
	;(globalThis as any).setTimeout = (callback: () => void) => { callback(); return 0 }
	try { return await work() } finally { globalThis.setTimeout = original }
}

test('cron rejects requests without the configured secret', async () => {
	const previous = process.env.CRON_SECRET
	delete process.env.CRON_SECRET
	const result = response()
	await handler({ headers: {} }, result)
	assert.equal(result.value.statusCode, 401)
	if (previous) process.env.CRON_SECRET = previous
})

test('cron rejects an invalid bearer token', async () => {
	const previous = process.env.CRON_SECRET
	process.env.CRON_SECRET = 'expected'
	const result = response()
	await handler({ headers: { authorization: 'Bearer wrong' } }, result)
	assert.equal(result.value.statusCode, 401)
	if (previous) process.env.CRON_SECRET = previous; else delete process.env.CRON_SECRET
})

test('cron processes all fifteen configured symbols', async () => {
	const previous = process.env.CRON_SECRET
	process.env.CRON_SECRET = 'expected'
	const original = CandlesService.getCandles
	;(CandlesService as any).getCandles = async (symbol: string, market: string) => ({ count: 500, symbol, market })
	try {
		const result = response()
		await runWithoutDelay(() => handler({ headers: { authorization: 'Bearer expected' } }, result))
		assert.equal(result.value.statusCode, 200)
		assert.equal((result.value.body as any).total, 15)
		assert.equal((result.value.body as any).succeeded, 15)
		assert.equal(refreshSymbols.length, 15)
	} finally {
		;(CandlesService as any).getCandles = original
		if (previous) process.env.CRON_SECRET = previous; else delete process.env.CRON_SECRET
	}
})

test('cron records source errors without aborting the batch', async () => {
	const previous = process.env.CRON_SECRET
	process.env.CRON_SECRET = 'expected'
	const original = CandlesService.getCandles
	let calls = 0
	;(CandlesService as any).getCandles = async () => { calls += 1; if (calls === 3) throw new Error('fixture failure'); return { count: 500 } }
	try {
		const results = await runWithoutDelay(refreshDaily)
		assert.equal(results.length, 15)
		assert.equal(results.filter((item) => item.status === 'error').length, 1)
		assert.equal(results.filter((item) => item.status === 'ok').length, 14)
	} finally {
		;(CandlesService as any).getCandles = original
		if (previous) process.env.CRON_SECRET = previous; else delete process.env.CRON_SECRET
	}
})

test('cron returns a stable success envelope', async () => {
	const previous = process.env.CRON_SECRET
	process.env.CRON_SECRET = 'expected'
	const original = CandlesService.getCandles
	;(CandlesService as any).getCandles = async () => ({ count: 1 })
	try {
		const result = response()
		await runWithoutDelay(() => handler({ headers: { authorization: 'Bearer expected' } }, result))
		assert.equal((result.value.body as any).status, 'success')
		assert.equal(typeof (result.value.body as any).executed_at, 'string')
	} finally {
		;(CandlesService as any).getCandles = original
		if (previous) process.env.CRON_SECRET = previous; else delete process.env.CRON_SECRET
	}
})
