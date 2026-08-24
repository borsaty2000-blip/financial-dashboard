import { describe, expect, it } from 'vitest'
import { createApiError } from '@client/shared/errors/api-error'
import { createHttpError } from '@client/shared/errors/http-error'
import { shouldRetryHttpError } from '@client/shared/service-utils/retry-policy/should-retry-http-error'

describe('shouldRetryHttpError', () => {
	it('retries network failures', () => {
		expect(
			shouldRetryHttpError(createHttpError('network', 'Network unavailable')),
		).toBe(true)
	})

	it.each([408, 429, 500, 502, 503, 504])(
		'retries a transient HTTP %i response',
		(status) => {
			expect(
				shouldRetryHttpError(
					createHttpError('bad-response', 'Request failed', {
						meta: { status },
					}),
				),
			).toBe(true)
		},
	)

	it.each([400, 401, 404, 501])(
		'does not retry a permanent HTTP %i response',
		(status) => {
			expect(
				shouldRetryHttpError(
					createHttpError('bad-response', 'Request failed', {
						meta: { status },
					}),
				),
			).toBe(false)
		},
	)

	it.each([
		createHttpError('abort', 'Request aborted'),
		createHttpError('invalid-json', 'Invalid JSON'),
		createHttpError('bad-response', 'Missing response metadata'),
		createApiError('invalid-response', 'Invalid API response'),
		new Error('Unknown failure'),
		{ layer: 'http', type: 503, message: 'Invalid error type' },
		'Unknown failure',
		null,
	])('does not retry non-transient or non-HTTP errors', (error) => {
		expect(shouldRetryHttpError(error)).toBe(false)
	})
})
