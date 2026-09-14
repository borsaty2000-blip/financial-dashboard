export type StrategyNodeType =
	| 'price'
	| 'volume'
	| 'rsi'
	| 'sma'
	| 'ema'
	| 'macd'
	| 'bollinger'
	| 'atr'
	| 'crossover'
	| 'threshold'
	| 'and'
	| 'or'
	| 'not'
	| 'time-filter'
	| 'market-filter'
	| 'buy'
	| 'sell'
	| 'hold'
	| 'stop-loss'
	| 'take-profit'
	| 'position-size'
	| 'risk-limit'
	| 'output'
export type StrategyNode = {
	id: string
	type: StrategyNodeType
	label?: string
	config?: Record<string, number | string | boolean>
}
export type StrategyEdge = { id: string; source: string; target: string }
export type StrategyGraph = {
	id: string
	name: string
	version: number
	nodes: StrategyNode[]
	edges: StrategyEdge[]
}
export type StrategyValidation = {
	valid: boolean
	errors: string[]
	warnings: string[]
}
export type StrategyCandle = {
	time: string
	open: number
	high: number
	low: number
	close: number
	volume?: number | null
}
export type BacktestTrade = {
	time: string
	side: 'BUY' | 'SELL'
	price: number
	returnPercent?: number
}
export type StrategyBacktest = {
	educational: true
	trades: BacktestTrade[]
	totalTrades: number
	winRate: number | null
	averageReturn: number | null
	maxDrawdown: number | null
	disclaimer: 'محاكاة تاريخية تعليمية وليست ضماناً للنتائج'
}

type StrategyNodeCategory =
	'input' | 'indicator' | 'logic' | 'action' | 'risk' | 'output'

const strategyNodeDefinitions: Array<
	[StrategyNodeType, string, StrategyNodeCategory]
> = [
	['price', 'السعر', 'input'],
	['volume', 'الحجم', 'input'],
	['rsi', 'RSI', 'indicator'],
	['sma', 'SMA', 'indicator'],
	['ema', 'EMA', 'indicator'],
	['macd', 'MACD', 'indicator'],
	['bollinger', 'Bollinger Bands', 'indicator'],
	['atr', 'ATR', 'indicator'],
	['crossover', 'تقاطع', 'logic'],
	['threshold', 'مقارنة حدية', 'logic'],
	['and', 'و', 'logic'],
	['or', 'أو', 'logic'],
	['not', 'ليس', 'logic'],
	['time-filter', 'فلتر زمني', 'logic'],
	['market-filter', 'فلتر سوق', 'logic'],
	['buy', 'شراء افتراضي', 'action'],
	['sell', 'بيع افتراضي', 'action'],
	['hold', 'انتظار', 'action'],
	['stop-loss', 'وقف خسارة', 'risk'],
	['take-profit', 'هدف ربحي', 'risk'],
	['position-size', 'حجم مركز', 'risk'],
	['risk-limit', 'حد مخاطرة', 'risk'],
	['output', 'إشارة', 'output'],
]

export const strategyNodeRegistry: Array<{
	type: StrategyNodeType
	label: string
	category: 'input' | 'indicator' | 'logic' | 'action' | 'risk' | 'output'
}> = strategyNodeDefinitions.map(([type, label, category]) => ({
	type,
	label,
	category,
}))

const registryTypes = new Set(strategyNodeRegistry.map((node) => node.type))
export function validateStrategy(graph: StrategyGraph): StrategyValidation {
	const errors: string[] = []
	const warnings: string[] = []
	if (!graph.id || !graph.name) errors.push('strategy id and name are required')
	if (graph.version < 1) errors.push('strategy version must be positive')
	const ids = new Set<string>()
	for (const node of graph.nodes) {
		if (ids.has(node.id)) errors.push(`duplicate node: ${node.id}`)
		ids.add(node.id)
		if (!registryTypes.has(node.type))
			errors.push(`unknown node type: ${node.type}`)
	}
	for (const edge of graph.edges) {
		if (!ids.has(edge.source) || !ids.has(edge.target))
			errors.push(`edge references missing node: ${edge.id}`)
		if (edge.source === edge.target) errors.push(`self loop: ${edge.id}`)
	}
	const outputs = graph.nodes.filter((node) => node.type === 'output')
	if (outputs.length !== 1)
		errors.push('strategy must contain exactly one output node')
	const indegree = new Map(graph.nodes.map((node) => [node.id, 0]))
	for (const edge of graph.edges)
		if (indegree.has(edge.target))
			indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
	const queue = graph.nodes
		.filter((node) => (indegree.get(node.id) ?? 0) === 0)
		.map((node) => node.id)
	let visited = 0
	while (queue.length) {
		const id = queue.shift()!
		visited += 1
		for (const edge of graph.edges.filter((item) => item.source === id)) {
			const next = (indegree.get(edge.target) ?? 0) - 1
			indegree.set(edge.target, next)
			if (next === 0) queue.push(edge.target)
		}
	}
	if (visited !== graph.nodes.length)
		errors.push('strategy graph contains a cycle')
	if (
		!graph.nodes.some((node) =>
			['rsi', 'sma', 'ema', 'macd', 'bollinger'].includes(node.type),
		)
	)
		warnings.push('strategy has no technical indicator')
	if (
		!graph.nodes.some((node) => ['stop-loss', 'risk-limit'].includes(node.type))
	)
		warnings.push('strategy has no explicit risk limit')
	return { valid: errors.length === 0, errors, warnings }
}

export function createRsiTemplate(): StrategyGraph {
	return {
		id: 'rsi-cross-template',
		name: 'RSI educational template',
		version: 1,
		nodes: [
			{ id: 'price', type: 'price' },
			{ id: 'rsi', type: 'rsi', config: { period: 14 } },
			{
				id: 'threshold',
				type: 'threshold',
				config: { operator: 'below', value: 30 },
			},
			{ id: 'buy', type: 'buy' },
			{ id: 'risk', type: 'risk-limit', config: { maxPercent: 2 } },
			{ id: 'output', type: 'output' },
		],
		edges: [
			{ id: 'e1', source: 'price', target: 'rsi' },
			{ id: 'e2', source: 'rsi', target: 'threshold' },
			{ id: 'e3', source: 'threshold', target: 'buy' },
			{ id: 'e4', source: 'buy', target: 'risk' },
			{ id: 'e5', source: 'risk', target: 'output' },
		],
	}
}

function drawdown(equity: number[]) {
	let peak = equity[0] ?? 1
	let max = 0
	for (const value of equity) {
		peak = Math.max(peak, value)
		max = Math.max(max, peak === 0 ? 0 : (peak - value) / peak)
	}
	return max * 100
}
export function runEducationalBacktest(
	graph: StrategyGraph,
	candles: StrategyCandle[],
): StrategyBacktest | { error: string; validation: StrategyValidation } {
	const validation = validateStrategy(graph)
	if (!validation.valid) return { error: 'invalid strategy graph', validation }
	if (candles.length < 30)
		return { error: 'at least 30 candles are required', validation }
	const threshold = Number(
		graph.nodes.find((node) => node.type === 'threshold')?.config?.value ?? 30,
	)
	const trades: BacktestTrade[] = []
	const equity = [1]
	for (let index = 14; index < candles.length; index += 1) {
		const current = candles[index].close
		const window = candles
			.slice(index - 14, index + 1)
			.map((candle) => candle.close)
		const gains = window.slice(1).filter((value, i) => value > window[i]).length
		const rsi = (gains / Math.max(1, window.length - 1)) * 100
		if (rsi < threshold) {
			const next = candles[Math.min(index + 5, candles.length - 1)].close
			const returnPercent = ((next - current) / current) * 100
			trades.push({
				time: candles[index].time,
				side: 'BUY',
				price: current,
				returnPercent,
			})
			equity.push((equity[equity.length - 1] ?? 1) * (1 + returnPercent / 100))
		}
	}
	const returns = trades.map((trade) => trade.returnPercent ?? 0)
	return {
		educational: true,
		trades,
		totalTrades: trades.length,
		winRate: returns.length
			? (returns.filter((value) => value > 0).length / returns.length) * 100
			: null,
		averageReturn: returns.length
			? returns.reduce((sum, value) => sum + value, 0) / returns.length
			: null,
		maxDrawdown: drawdown(equity),
		disclaimer: 'محاكاة تاريخية تعليمية وليست ضماناً للنتائج',
	}
}
