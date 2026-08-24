import { afterEach, describe, expect, it, vi } from 'vitest'

import { withRetry } from '@client/shared/service-utils/retry-policy/with-retry'

afterEach(() => {
	vi.useRealTimers()
})

describe('withRetry', () => {
	it('returns the first successful result without retrying', async () => {
		const operation = vi.fn().mockResolvedValue('report')
		const shouldRetry = vi.fn(() => true)

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				shouldRetry,
			}),
		).resolves.toBe('report')

		expect(operation).toHaveBeenCalledOnce()
		expect(operation).toHaveBeenCalledWith(expect.any(AbortSignal))
		expect(shouldRetry).not.toHaveBeenCalled()
	})

	it('retries a policy-approved failure and returns a later result', async () => {
		const retryableError = new Error('Temporary failure')
		const operation = vi
			.fn()
			.mockRejectedValueOnce(retryableError)
			.mockResolvedValueOnce('report')
		const shouldRetry = vi.fn(() => true)

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				shouldRetry,
			}),
		).resolves.toBe('report')

		expect(operation).toHaveBeenCalledTimes(2)
		expect(shouldRetry).toHaveBeenCalledOnce()
		expect(shouldRetry).toHaveBeenCalledWith(retryableError)
	})

	it('does not retry a failure rejected by the error policy', async () => {
		const failure = new Error('Permanent failure')
		const operation = vi.fn().mockRejectedValue(failure)
		const shouldRetry = vi.fn(() => false)

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				shouldRetry,
			}),
		).rejects.toBe(failure)

		expect(operation).toHaveBeenCalledOnce()
		expect(shouldRetry).toHaveBeenCalledOnce()
	})

	it('does not retry a failure when no error policy is configured', async () => {
		const failure = new Error('Unclassified failure')
		const operation = vi.fn().mockRejectedValue(failure)

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
			}),
		).rejects.toBe(failure)

		expect(operation).toHaveBeenCalledOnce()
	})

	it('throws the last retryable failure after exhausting all attempts', async () => {
		const failures = [
			new Error('First failure'),
			new Error('Second failure'),
			new Error('Final failure'),
		]
		const operation = vi
			.fn()
			.mockRejectedValueOnce(failures[0])
			.mockRejectedValueOnce(failures[1])
			.mockRejectedValueOnce(failures[2])

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				shouldRetry: () => true,
			}),
		).rejects.toBe(failures[2])

		expect(operation).toHaveBeenCalledTimes(3)
	})

	it('retries its own timeout without consulting the error policy', async () => {
		vi.useFakeTimers()

		const operation = vi.fn((signal: AbortSignal) => {
			return new Promise<never>((_, reject) => {
				signal.addEventListener(
					'abort',
					() => reject(new DOMException('Request aborted', 'AbortError')),
					{ once: true },
				)
			})
		})
		const shouldRetry = vi.fn(() => false)

		const result = withRetry(operation, {
			attempts: 3,
			timeoutMs: 100,
			shouldRetry,
		})
		const rejection = expect(result).rejects.toThrow(
			'Operation timed out after 100ms',
		)

		await vi.runAllTimersAsync()
		await rejection

		expect(operation).toHaveBeenCalledTimes(3)
		expect(shouldRetry).not.toHaveBeenCalled()
	})

	it('stops immediately when the external signal is aborted', async () => {
		const controller = new AbortController()
		const shouldRetry = vi.fn(() => true)
		const operation = vi.fn((signal: AbortSignal) => {
			return new Promise<never>((_, reject) => {
				signal.addEventListener(
					'abort',
					() => reject(new DOMException('Request aborted', 'AbortError')),
					{ once: true },
				)
			})
		})

		const result = withRetry(operation, {
			attempts: 3,
			timeoutMs: 5000,
			shouldRetry,
			externalSignal: controller.signal,
		})

		controller.abort()

		await expect(result).rejects.toMatchObject({ name: 'AbortError' })
		expect(operation).toHaveBeenCalledTimes(1)
		expect(shouldRetry).not.toHaveBeenCalled()
	})

	it('does not start an operation for a pre-aborted external signal', async () => {
		const controller = new AbortController()
		const abortReason = new Error('Request was cancelled before loading')
		const operation = vi.fn().mockResolvedValue('report')
		controller.abort(abortReason)

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				externalSignal: controller.signal,
			}),
		).rejects.toBe(abortReason)

		expect(operation).not.toHaveBeenCalled()
	})

	it('rejects a late success after external cancellation', async () => {
		const controller = new AbortController()
		const abortReason = new Error('Request was cancelled while loading')
		let resolveOperation!: (value: string) => void
		const operation = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					resolveOperation = resolve
				}),
		)

		const result = withRetry(operation, {
			attempts: 3,
			timeoutMs: 5000,
			externalSignal: controller.signal,
		})

		controller.abort(abortReason)
		resolveOperation('stale report')

		await expect(result).rejects.toBe(abortReason)
		expect(operation).toHaveBeenCalledOnce()
	})

	it('discards a late timed-out success before starting the next attempt', async () => {
		vi.useFakeTimers()

		let resolveFirstAttempt!: (value: string) => void
		const operation = vi
			.fn<(signal: AbortSignal) => Promise<string>>()
			.mockImplementationOnce(
				() =>
					new Promise<string>((resolve) => {
						resolveFirstAttempt = resolve
					}),
			)
			.mockResolvedValueOnce('fresh report')

		const result = withRetry(operation, {
			attempts: 2,
			timeoutMs: 100,
		})

		await vi.advanceTimersByTimeAsync(100)
		expect(operation).toHaveBeenCalledOnce()

		resolveFirstAttempt('stale report')

		await expect(result).resolves.toBe('fresh report')
		expect(operation).toHaveBeenCalledTimes(2)
	})

	it('does not start another attempt when cancellation occurs between attempts', async () => {
		const controller = new AbortController()
		const abortReason = new Error('Request was cancelled before retry')
		const operation = vi.fn().mockRejectedValue(new Error('Temporary failure'))
		const shouldRetry = vi.fn(() => {
			controller.abort(abortReason)
			return true
		})

		await expect(
			withRetry(operation, {
				attempts: 3,
				timeoutMs: 100,
				shouldRetry,
				externalSignal: controller.signal,
			}),
		).rejects.toBe(abortReason)

		expect(operation).toHaveBeenCalledOnce()
		expect(shouldRetry).toHaveBeenCalledOnce()
	})

	it.each([
		{
			name: 'attempt count',
			options: { attempts: 0, timeoutMs: 100 },
			message: 'Retry attempts must be a positive integer',
		},
		{
			name: 'timeout',
			options: { attempts: 1, timeoutMs: 0 },
			message: 'Retry timeout must be greater than 0',
		},
	])(
		'rejects an invalid $name before starting the operation',
		async ({ options, message }) => {
			const operation = vi.fn().mockResolvedValue('report')

			await expect(withRetry(operation, options)).rejects.toThrow(message)
			expect(operation).not.toHaveBeenCalled()
		},
	)
})
