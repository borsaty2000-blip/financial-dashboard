import { type AppError } from '@client/shared/errors/create-error-factory'

export const isAppError = (
	error: unknown,
): error is AppError<string, unknown> => {
	if (typeof error !== 'object' || error === null) {
		return false
	}

	return (
		'layer' in error &&
		'type' in error &&
		'message' in error &&
		typeof error.layer === 'string' &&
		typeof error.type === 'string' &&
		typeof error.message === 'string' &&
		(error.layer === 'http' ||
			error.layer === 'api' ||
			error.layer === 'application')
	)
}
