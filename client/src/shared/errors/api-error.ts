import { createErrorFactory } from '@client/shared/errors/create-error-factory'

type ApiErrorType = 'invalid-response'

export const createApiError = createErrorFactory<'api', ApiErrorType>('api')
