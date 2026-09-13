import { Router } from 'express'
import {
	loginController,
	logoutController,
	meController,
	refreshController,
	registerController,
	forgotPasswordController,
	resetPasswordController,
	verifyResetTokenController,
} from '../controllers/auth.controller.js'
import { requireAuth } from '../middleware/auth.js'
import {
	authRateLimit,
	forgotRateLimit,
	resetRateLimit,
} from '../middleware/rateLimit.js'

export const authRoutes = Router()
authRoutes.post('/register', authRateLimit, registerController)
authRoutes.post('/login', authRateLimit, loginController)
authRoutes.post('/logout', logoutController)
authRoutes.post('/refresh', refreshController)
authRoutes.get('/me', requireAuth, meController)
authRoutes.post('/forgot-password', forgotRateLimit, forgotPasswordController)
authRoutes.post('/reset-password', resetRateLimit, resetPasswordController)
authRoutes.get(
	'/verify-reset-token/:token',
	resetRateLimit,
	verifyResetTokenController,
)
