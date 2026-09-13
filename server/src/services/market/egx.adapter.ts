import { spawn } from 'node:child_process'
import { unavailable, type MarketEnvelope, live } from './market.types.js'

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
		return unavailable(
			'EGX MCP',
			error instanceof Error ? error.message : 'EGX unavailable',
		)
	}
}

export async function getEgxSummary() {
	const [gold, silver] = await Promise.all([
		getEgxMetals('gold'),
		getEgxMetals('silver'),
	])
	return {
		data: { gold: gold.data, silver: silver.data },
		source: 'EGX MCP' as const,
		timestamp: new Date().toISOString(),
		freshness:
			gold.available && silver.available
				? ('live' as const)
				: ('cached' as const),
		delay_minutes:
			gold.available && silver.available ? (0 as const) : (15 as const),
		available: gold.available || silver.available,
	}
}
