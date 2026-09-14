import { createHmac, timingSafeEqual } from 'node:crypto'
import { Router, type Request } from 'express'
import { publishTradingViewSignal } from '../services/tradingview/signal-bus.js'
import { webhookRateLimit } from '../middleware/rateLimit.js'

export const tradingViewRoutes = Router()
tradingViewRoutes.use(webhookRateLimit)

function isValidSecret(request: Request) {
	const configured = process.env.TRADINGVIEW_WEBHOOK_SECRET
	if (!configured) return false
	const received =
		request.header('x-tradingview-secret') ?? request.header('x-webhook-secret')
	if (!received) return false
	const expected = createHmac('sha256', configured)
		.update('borsaty-tradingview')
		.digest('hex')
	const receivedBuffer = Buffer.from(received)
	const expectedBuffer = Buffer.from(expected)
	return (
		receivedBuffer.length === expectedBuffer.length &&
		timingSafeEqual(receivedBuffer, expectedBuffer)
	)
}

tradingViewRoutes.post('/', (request, response) => {
	if (!isValidSecret(request))
		return response.status(401).json({ error: 'Invalid webhook signature' })
	if (!request.body || typeof request.body !== 'object')
		return response.status(400).json({ error: 'JSON payload is required' })
	publishTradingViewSignal(request.body)
	return response.status(202).json({ accepted: true })
})
