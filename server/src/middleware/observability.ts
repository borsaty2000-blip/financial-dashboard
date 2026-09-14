import { randomUUID } from 'node:crypto'
import type {
	ErrorRequestHandler,
	NextFunction,
	Request,
	Response,
} from 'express'
import * as Sentry from '@sentry/node'

declare global {
	namespace Express {
		interface Request {
			requestId: string
		}
	}
}

const safeRequestId = /^[A-Za-z0-9._-]{1,100}$/

export function initializeOptionalSentry() {
	const dsn = process.env.SENTRY_DSN?.trim()
	if (!dsn) return false
	Sentry.init({
		dsn,
		environment: process.env.NODE_ENV ?? 'development',
		tracesSampleRate: 0.05,
	})
	return true
}

export function requestObservability(
	request: Request,
	response: Response,
	next: NextFunction,
) {
	const supplied = request.header('x-request-id')
	request.requestId =
		supplied && safeRequestId.test(supplied) ? supplied : randomUUID()
	response.setHeader('X-Request-ID', request.requestId)
	const startedAt = process.hrtime.bigint()
	response.on('finish', () => {
		const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
		console.info(
			JSON.stringify({
				event: 'http_request',
				requestId: request.requestId,
				method: request.method,
				path: `${request.baseUrl}${request.path}`,
				status: response.statusCode,
				durationMs: Math.round(durationMs * 100) / 100,
			}),
		)
	})
	next()
}

export const safeErrorHandler: ErrorRequestHandler = (
	error,
	request,
	response,
	next,
) => {
	if (response.headersSent) return next(error)
	const message =
		error instanceof Error ? error.message : 'Internal server error'
	if (process.env.SENTRY_DSN) Sentry.captureException(error)
	console.error(
		JSON.stringify({
			event: 'http_error',
			requestId: request.requestId,
			message,
		}),
	)
	return response
		.status(500)
		.json({ error: 'Internal server error', requestId: request.requestId })
}
