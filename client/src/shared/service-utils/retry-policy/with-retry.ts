type RetryOptions = {
	attempts: number
	timeoutMs: number
	shouldRetry?: (error: unknown) => boolean
	externalSignal?: AbortSignal
}

type RetryOperation<T> = (signal: AbortSignal) => Promise<T>

type AttemptResult<T> =
	| { status: 'success'; value: T }
	| { status: 'failure'; error: unknown; timedOut: boolean }

export const withRetry = async <T>(
	operation: RetryOperation<T>,
	options: RetryOptions,
): Promise<T> => {
	validateRetryOptions(options)

	for (let attempt = 1; ; attempt++) {
		options.externalSignal?.throwIfAborted()

		const result = await runWithTimeout(
			operation,
			options.timeoutMs,
			options.externalSignal,
		)

		if (result.status === 'success') {
			options.externalSignal?.throwIfAborted()
			return result.value
		}

		if (options.externalSignal?.aborted) {
			throw result.error
		}

		const isLastAttempt = attempt >= options.attempts

		if (result.timedOut) {
			if (isLastAttempt) {
				throw new Error(`Operation timed out after ${options.timeoutMs}ms`, {
					cause: result.error,
				})
			}

			continue
		}

		const canRetry = options.shouldRetry?.(result.error) ?? false

		if (isLastAttempt || !canRetry) {
			throw result.error
		}
	}
}

const runWithTimeout = async <T>(
	operation: RetryOperation<T>,
	timeoutMs: number,
	externalSignal?: AbortSignal,
): Promise<AttemptResult<T>> => {
	const timeoutController = new AbortController()

	const signal = externalSignal
		? AbortSignal.any([externalSignal, timeoutController.signal])
		: timeoutController.signal

	const timeoutId = setTimeout(() => {
		timeoutController.abort()
	}, timeoutMs)

	try {
		const value = await operation(signal)

		externalSignal?.throwIfAborted()
		timeoutController.signal.throwIfAborted()

		return {
			status: 'success',
			value,
		}
	} catch (error) {
		return {
			status: 'failure',
			error,
			timedOut: timeoutController.signal.aborted && !externalSignal?.aborted,
		}
	} finally {
		clearTimeout(timeoutId)
	}
}

const validateRetryOptions = (options: RetryOptions): void => {
	if (!Number.isInteger(options.attempts) || options.attempts < 1) {
		throw new RangeError('Retry attempts must be a positive integer')
	}

	if (!Number.isFinite(options.timeoutMs) || options.timeoutMs <= 0) {
		throw new RangeError('Retry timeout must be greater than 0')
	}
}
