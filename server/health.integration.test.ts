import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

process.env.VERCEL = '1'
process.env.NODE_ENV = 'production'

const { default: app } = await import('./index.ts')

async function withServer<T>(run: (baseUrl: string) => Promise<T>) {
	const server = createServer(app)
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const address = server.address()
	if (!address || typeof address === 'string')
		throw new Error('server did not bind')
	try {
		return await run(`http://127.0.0.1:${address.port}`)
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		)
	}
}

test('health remains available in Vercel runtime mode', async () => {
	await withServer(async (baseUrl) => {
		const response = await fetch(`${baseUrl}/api/health`)
		assert.equal(response.status, 200)
		assert.deepEqual(await response.json(), {
			ok: true,
			service: 'financial-dashboard-api',
		})
	})
})

test('market compatibility endpoints return explicit envelopes', async () => {
	await withServer(async (baseUrl) => {
		for (const path of ['/api/market/gold', '/api/market/silver']) {
			const response = await fetch(`${baseUrl}${path}`)
			assert.equal(response.status, 200)
			const body = (await response.json()) as {
				available?: boolean
				data?: unknown
			}
			assert.equal(typeof body.available, 'boolean')
			assert.ok('data' in body)
		}
	})
})
