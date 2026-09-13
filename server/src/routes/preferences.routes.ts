import { Router } from 'express'
import {
	getPreferencesController,
	personalizedDashboardController,
	updatePreferencesController,
} from '../controllers/preferences.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const preferencesRoutes = Router()
preferencesRoutes.use(requireAuth)
preferencesRoutes.get('/', getPreferencesController)
preferencesRoutes.put('/', updatePreferencesController)
preferencesRoutes.get('/dashboard', personalizedDashboardController)
