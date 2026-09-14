import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'

process.env.VERCEL = '1'
process.env.NODE_ENV = 'test'

const { default: app } = await import('./index.ts')

async function request(path: string, init: RequestInit = {}) {
	const server = createServer(app)
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
	const address = server.address()
	if (!address || typeof address === 'string')
		throw new Error('server address unavailable')
	try {
		return await fetch(`http://127.0.0.1:${address.port}${path}`, init)
	} finally {
		await new Promise<void>((resolve, reject) =>
			server.close((error) => (error ? reject(error) : resolve())),
		)
	}
}

test('self-award achievement routes are not exposed', async () => {
	const award = await request('/api/achievements/award/FIRST_LOGIN', {
		method: 'POST',
		headers: { authorization: 'Bearer invalid' },
	})
	const check = await request('/api/achievements/check', {
		method: 'POST',
		headers: { authorization: 'Bearer invalid' },
		body: JSON.stringify({ action: 'BORSATY_MASTER' }),
	})
	assert.equal(award.status, 401)
	assert.equal(check.status, 401)
})

test('untrusted origins do not receive CORS permission', async () => {
	const response = await request('/api/health', {
		headers: { origin: 'https://untrusted.example' },
	})
	assert.equal(response.status, 200)
	assert.equal(response.headers.get('access-control-allow-origin'), null)
})
