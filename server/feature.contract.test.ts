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

test('AI assistant validates empty messages without a provider', async () => {
	await withServer(async (baseUrl) => {
		const response = await fetch(`${baseUrl}/api/ai/chat`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ message: '' }),
		})
		assert.equal(response.status, 400)
		assert.equal(typeof (await response.json()).error, 'string')
	})
})

test('AI assistant returns an educational response for a generic question', async () => {
	await withServer(async (baseUrl) => {
		const response = await fetch(`${baseUrl}/api/ai/chat`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ message: 'اشرح RSI' }),
		})
		assert.equal(response.status, 200)
		const body = (await response.json()) as {
			message: string
			disclaimer: string
			available: boolean
		}
		assert.equal(typeof body.message, 'string')
		assert.equal(typeof body.disclaimer, 'string')
		assert.equal(body.available, false)
	})
})
