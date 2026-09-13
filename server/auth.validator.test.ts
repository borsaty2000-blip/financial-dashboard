import test from 'node:test'
import assert from 'node:assert/strict'
import { loginSchema, registerSchema } from './src/validators/auth.validator.js'

test('register accepts valid input and applies defaults', () => {
	const result = registerSchema.parse({
		email: 'USER@EXAMPLE.COM',
		username: 'user_1',
		password: 'Test1234',
	})
	assert.equal(result.email, 'user@example.com')
	assert.equal(result.country, 'EG')
	assert.equal(result.language, 'ar')
})
test('register rejects weak password and invalid username', () => {
	assert.throws(() =>
		registerSchema.parse({
			email: 'a@b.com',
			username: 'x',
			password: 'password',
		}),
	)
})
test('login accepts email or username identifier', () => {
	assert.deepEqual(
		loginSchema.parse({ identifier: 'user_1', password: 'Test1234' }),
		{ identifier: 'user_1', password: 'Test1234' },
	)
})
