import type { NextFunction, Request, Response } from 'express'
export function languageMiddleware(
	request: Request,
	response: Response,
	next: NextFunction,
) {
	const requested =
		request.header('accept-language')?.split(',')[0]?.split('-')[0] ?? 'ar'
	response.locals.language = ['ar', 'en', 'fr'].includes(requested)
		? requested
		: 'ar'
	next()
}
