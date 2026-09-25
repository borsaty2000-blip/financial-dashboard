import { Router } from 'express'
import { AnalysisOrchestrator } from '../services/analysis/orchestrator.js'
import type { CandleMarket } from '../services/market/candles.service.js'

export const analysisHealthRoutes = Router()

analysisHealthRoutes.get('/analysis', async (_request, response) => {
	const symbols = ['COMI', 'ABUK', 'EAST', 'HRHO', 'TMGH']
	const started = Date.now()
	const checks = await Promise.all(symbols.map(async (symbol) => {
		try {
			const result = await AnalysisOrchestrator.analyze(symbol, 'EGX' as CandleMarket)
			return {
				symbol,
				integrity: result.integrity.score,
				candles: result.candles.count,
				elliott: result.elliott.available,
				gann: result.gann.available,
				harmonic: result.harmonic.available,
				confluence: result.confluence.available,
				recommendation: result.recommendation.available,
				latency_ms: result.latency_ms,
				cache_hit: result.cache_hit,
				issues: result.integrity.issues,
			}
		} catch (error) {
			return { symbol, integrity: 0, candles: 0, elliott: false, gann: false, harmonic: false, confluence: false, recommendation: false, latency_ms: 0, cache_hit: false, issues: [error instanceof Error ? error.message : 'health_check_failed'] }
		}
	}))
	const avgIntegrity = Math.round(checks.reduce((sum, item) => sum + item.integrity, 0) / checks.length)
	response.json({
		status: avgIntegrity >= 80 ? 'healthy' : avgIntegrity >= 60 ? 'degraded' : 'unhealthy',
		avg_integrity: avgIntegrity,
		checks,
		latency_ms: Date.now() - started,
		timestamp: new Date().toISOString(),
	})
})
