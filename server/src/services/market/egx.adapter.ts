import { spawn } from 'node:child_process'
import {
	delayed,
	live,
	unavailable,
	type Freshness,
	type MarketEnvelope,
	type MarketSource,
} from './market.types.js'
import { CommoditiesService } from './commodities.service.js'
import { getYahooDelayedEnvelope, getYahooQuote } from './yahoo.adapter.js'

type EgxRequest =
	| { tool: 'stock_price_egx'; symbol: string }
	| { tool: 'stock_data_egx'; symbol: string }
	| { tool: 'gold_price' }
	| { tool: 'silver_price' }

type EgxResponse = { ok: boolean; data?: unknown; error?: string }

const python = process.env.EGX_PYTHON ?? 'python3'
const script = process.env.EGX_ADAPTER_SCRIPT

function runOfficialTool(request: EgxRequest): Promise<unknown> {
	if (!script) {
		return Promise.reject(
			new Error(
				'EGX_ADAPTER_SCRIPT is not configured for the official EGX MCP tools',
			),
		)
	}
	return new Promise((resolve, reject) => {
		const child = spawn(python, [script], { env: process.env })
		let output = ''
		let error = ''
		child.stdout.on('data', (chunk) => (output += chunk.toString()))
		child.stderr.on('data', (chunk) => (error += chunk.toString()))
		child.once('error', reject)
		child.once('close', (code) => {
			if (code !== 0)
				return reject(new Error(error || `EGX tool exited with ${code}`))
			try {
				const response = JSON.parse(output) as EgxResponse
				if (!response.ok)
					return reject(new Error(response.error ?? 'EGX tool failed'))
				resolve(response.data)
			} catch {
				reject(new Error('EGX adapter returned invalid JSON'))
			}
		})
		child.stdin.end(JSON.stringify(request))
	})
}

export async function getEgxQuote(
	symbol: string,
): Promise<MarketEnvelope<unknown>> {
	try {
		return live(
			'EGX MCP',
			await runOfficialTool({ tool: 'stock_price_egx', symbol }),
		)
	} catch (error) {
		return unavailable(
			'EGX MCP',
			error instanceof Error ? error.message : 'EGX unavailable',
		)
	}
}

export async function getEgxCompanyData(
	symbol: string,
): Promise<MarketEnvelope<unknown>> {
	try {
		return live(
			'EGX MCP',
			await runOfficialTool({ tool: 'stock_data_egx', symbol }),
		)
	} catch (error) {
		return unavailable(
			'EGX MCP',
			error instanceof Error ? error.message : 'EGX unavailable',
		)
	}
}

export async function getEgxMetals(metal: 'gold' | 'silver') {
	try {
		return live(
			'EGX MCP',
			await runOfficialTool({
				tool: metal === 'gold' ? 'gold_price' : 'silver_price',
			}),
		)
	} catch (error) {
		const quote = await CommoditiesService.getQuote(
			metal === 'gold' ? 'XAU/USD' : 'XAG/USD',
		)
		if (quote.available)
			return process.env.TWELVE_DATA_REALTIME === 'true'
				? live('Twelve Data', quote)
				: delayed('Twelve Data', quote)
		try {
			return await getYahooDelayedEnvelope(metal === 'gold' ? 'GC=F' : 'SI=F')
		} catch {
			return unavailable(
				'Yahoo Finance',
				error instanceof Error ? error.message : 'Metal data unavailable',
			)
		}
	}
}

const egxIndexSymbols = {
	egx30: '^CASE30',
	egx70: '^EGX70EWI.CA',
	egx100: '^EGX100EWI.CA',
} as const

type EgxIndexQuote = {
	value: number
	change: number | null
	changePercent: number | null
	updatedAt: string | null
	source: MarketSource
	freshness: Freshness
	delay_minutes: number
}

async function getEgxIndex(
	index: keyof typeof egxIndexSymbols,
): Promise<EgxIndexQuote> {
	if (process.env.TWELVE_DATA_API_KEY) {
		try {
			const data = await fetch(
				`https://api.twelvedata.com/quote?symbol=${encodeURIComponent(index.toUpperCase())}&apikey=${encodeURIComponent(process.env.TWELVE_DATA_API_KEY)}`,
				{ signal: AbortSignal.timeout(8000) },
			).then((response) => response.json() as Promise<Record<string, unknown>>)
			const value = Number(data.close ?? data.price)
			if (Number.isFinite(value) && value > 0)
				return {
					value,
					change: Number(data.change) || null,
					changePercent: Number(data.percent_change) || null,
					updatedAt: typeof data.datetime === 'string' ? data.datetime : null,
					source: 'Twelve Data' as MarketSource,
					freshness:
						process.env.TWELVE_DATA_REALTIME === 'true'
							? ('live' as Freshness)
							: ('delayed' as Freshness),
					delay_minutes: process.env.TWELVE_DATA_REALTIME === 'true' ? 0 : 15,
				}
		} catch {
			/* fall through to Yahoo delayed */
		}
	}
	return {
		...(await getYahooQuote(egxIndexSymbols[index])),
		source: 'Yahoo Finance' as MarketSource,
		freshness: 'delayed' as Freshness,
		delay_minutes: 15,
	}
}

export async function getEgxSummary() {
	const [egx30, egx70, egx100, gold, silver] = await Promise.all([
		getEgxIndex('egx30').catch(() => null),
		getEgxIndex('egx70').catch(() => null),
		getEgxIndex('egx100').catch(() => null),
		getEgxMetals('gold'),
		getEgxMetals('silver'),
	])
	const indexEntries = [egx30, egx70, egx100].filter(
		(entry): entry is EgxIndexQuote => entry !== null,
	)
	const metalEntries = [gold, silver].filter((entry) => entry.available)
	const entries = [...indexEntries, ...metalEntries]
	const available = entries.length > 0
	const sources = new Set(entries.map((entry) => entry.source))
	const source = sources.size === 1 ? [...sources][0] : 'mixed'
	const freshness = entries.some((entry) => entry.freshness === 'delayed')
		? ('delayed' as const)
		: entries.some((entry) => entry.freshness === 'cached')
			? ('cached' as const)
			: ('live' as const)
	const delay_minutes = Math.max(
		0,
		...entries.map((entry) => entry.delay_minutes),
	)
	return {
		data: { egx30, egx70, egx100, gold: gold.data, silver: silver.data },
		source,
		timestamp: new Date().toISOString(),
		freshness,
		delay_minutes,
		available,
	}
}
