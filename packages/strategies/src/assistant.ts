import {
	createRsiTemplate,
	validateStrategy,
	type StrategyGraph,
} from './index'

export type StrategyAssistantRequest = {
	question: string
	symbol?: string
	market?: 'EGX' | 'TASI' | 'GOLD' | 'SILVER'
	riskProfile?: 'conservative' | 'balanced' | 'aggressive'
}

export type StrategyAssistantResponse = {
	provider: 'deterministic-fallback' | 'llm'
	explanation: string
	graph: StrategyGraph
	limitations: string[]
	disclaimer: 'هذا شرح تعليمي وليس توصية استثمارية أو تنفيذاً لصفقة'
}

export type StrategyAssistantProvider = {
	suggest: (
		request: StrategyAssistantRequest,
	) => Promise<StrategyAssistantResponse>
}

export function validateAssistantRequest(
	request: StrategyAssistantRequest,
): string[] {
	const errors: string[] = []
	if (!request.question.trim()) errors.push('question is required')
	if (request.symbol && !/^[A-Za-z0-9._-]{1,20}$/.test(request.symbol))
		errors.push('symbol format is invalid')
	return errors
}

export function createDeterministicAssistantSuggestion(
	request: StrategyAssistantRequest,
): StrategyAssistantResponse | { errors: string[] } {
	const errors = validateAssistantRequest(request)
	if (errors.length) return { errors }
	const graph = createRsiTemplate()
	const validation = validateStrategy(graph)
	if (!validation.valid) return { errors: ['fallback graph failed validation'] }
	const marketText = request.market ? ` في سوق ${request.market}` : ''
	const symbolText = request.symbol ? ` للرمز ${request.symbol}` : ''
	return {
		provider: 'deterministic-fallback',
		explanation: `هذا قالب تعليمي مبني على RSI${marketText}${symbolText}. يوضح كيف يمكن اختبار شرط تشبع بيعي قبل أي قرار افتراضي، ولا يحول السؤال إلى أمر تداول.`,
		graph,
		limitations: [
			'لا توجد بيانات سوق داخل هذا العقد',
			'لا توجد توصية شراء أو بيع',
			'لا يوجد اتصال بوسيط أو تنفيذ أوامر',
			'يجب اختبار النتائج خارج العينة مع مراعاة الرسوم والانزلاق',
		],
		disclaimer: 'هذا شرح تعليمي وليس توصية استثمارية أو تنفيذاً لصفقة',
	}
}
