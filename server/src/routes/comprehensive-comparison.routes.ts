import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { ComprehensiveComparisonService } from '../services/comparison/comprehensive.service.js'
export const comprehensiveComparisonRoutes = Router()
comprehensiveComparisonRoutes.get('/sectors', async (_req, res) =>
	res.json(await ComprehensiveComparisonService.sectors()),
)
comprehensiveComparisonRoutes.get('/periods', async (_req, res) =>
	res.json(await ComprehensiveComparisonService.periods()),
)
comprehensiveComparisonRoutes.get('/watchlist', requireAuth, async (req, res) =>
	res.json(await ComprehensiveComparisonService.watchlist(req.userId!)),
)
