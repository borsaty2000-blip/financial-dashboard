import { Router } from 'express'
import {
	loginController,
	logoutController,
	meController,
	refreshController,
	registerController,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'
import { authRateLimit } from '../middleware/rateLimit.js'

export const authRoutes = Router()
authRoutes.post('/register', authRateLimit, registerController)
authRoutes.post('/login', authRateLimit, loginController)
authRoutes.post('/logout', logoutController)
authRoutes.post('/refresh', refreshController)
authRoutes.get('/me', requireAuth, meController)
