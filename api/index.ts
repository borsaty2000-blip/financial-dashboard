import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { Request, Response } from 'express'

function loadFinancialData(): unknown {
	const candidates = [
		path.join(process.cwd(), 'server', 'data.json'),
		path.join(process.cwd(), 'data.json'),
	]
	const dataPath = candidates.find((candidate) => existsSync(candidate))
	if (!dataPath) {
		return {
			periods: [],
			company: { id: '', name: '', values: [], children: [] },
		}
	}
	try {
		return JSON.parse(readFileSync(dataPath, 'utf8'))
	} catch {
		return {
			periods: [],
			company: { id: '', name: '', values: [], children: [] },
		}
	}
}

export default async function handler(request: Request, response: Response) {
	const requestPath = request.url?.split('?')[0] ?? ''

	if (requestPath.endsWith('/health')) {
		response.status(200).json({ ok: true, service: 'financial-dashboard-api' })
		return
	}

	if (requestPath.endsWith('/financial-report')) {
		response.status(200).json(loadFinancialData())
		return
	}

	const { default: app } = await import('../server/index')
	app(request, response)
}
