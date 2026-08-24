import { isAppError } from '@client/shared/errors/error-type-guard'

export const shouldRetryHttpError = (error: unknown): boolean => {
	if (!isAppError(error)) {
		return false
	}

	if (error.layer !== 'http') {
		return false
	}

	switch (error.type) {
		case 'network':
			return true

		case 'invalid-json':
			return false

		case 'bad-response': {
			const meta = error.meta

			if (
				typeof meta !== 'object' ||
				meta === null ||
				!('status' in meta) ||
				typeof meta.status !== 'number'
			) {
				return false
			}

			return [408, 429, 500, 502, 503, 504].includes(meta.status)
		}

		default:
			return false
	}
}
