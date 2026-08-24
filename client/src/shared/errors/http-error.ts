import { createErrorFactory } from '@client/shared/errors/create-error-factory'

type HttpErrorType = 'network' | 'bad-response' | 'invalid-json' | 'abort'

export const createHttpError = createErrorFactory<'http', HttpErrorType>('http')
