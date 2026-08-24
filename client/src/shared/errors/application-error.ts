import { createErrorFactory } from '@client/shared/errors/create-error-factory'

type ApplicationErrorType = 'inconsistent-data'

export const createApplicationError = createErrorFactory<'application', ApplicationErrorType>('application')
