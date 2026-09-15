import { Router } from 'express'
import {
	AIAssistantService,
	listAssistantSymbols,
	type AssistantRequest,
} from '../services/ai/assistant.service.js'

const aiRoutes = Router()

aiRoutes.post('/chat', async (request, response) => {
	const body = request.body as Partial<AssistantRequest>
	if (typeof body.message !== 'string' || !body.message.trim())
		return response.status(400).json({ error: 'الرسالة مطلوبة' })
	const result = await AIAssistantService.chat({
		message: body.message,
		market:
			body.market === 'EGX' ||
			body.market === 'TASI' ||
			body.market === 'GLOBAL'
				? body.market
				: undefined,
		symbol: typeof body.symbol === 'string' ? body.symbol : undefined,
		history: Array.isArray(body.history)
			? body.history
					.filter(
						(item) =>
							item &&
							(item.role === 'user' || item.role === 'assistant') &&
							typeof item.content === 'string',
					)
					.slice(-12)
			: undefined,
	})
	return response.json(result)
})

aiRoutes.get('/symbols', async (_request, response) => {
	return response.json({ data: await listAssistantSymbols() })
})

export { aiRoutes }
