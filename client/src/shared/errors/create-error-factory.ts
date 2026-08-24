type ErrorLayer = 'http' | 'api' | 'application'

export type AppError<TErrorType, TErrorMeta = undefined> = {
	layer: ErrorLayer
	type: TErrorType
	message: string
	meta?: TErrorMeta
	cause?: unknown
}

type ErrorOptions<TMeta> = {
	meta?: TMeta
	cause?: unknown
}

export const createErrorFactory = <
	const TErrorLayer extends ErrorLayer,
	TErrorType,
>(
	layer: TErrorLayer,
) => {
	return <TMeta = undefined>(
		type: TErrorType,
		message: string,
		options?: ErrorOptions<TMeta>,
	): AppError<TErrorType, TMeta> => {
		return {
			layer,
			type,
			message,
			meta: options?.meta,
			cause: options?.cause,
		}
	}
}
