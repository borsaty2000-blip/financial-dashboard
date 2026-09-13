import { Router } from 'express'
import {
	allAchievementsController,
	awardController,
	checkController,
	leaderboardController,
	myAchievementsController,
	progressController,
} from '../controllers/achievements.controller.js'
import { requireAuth } from '../middleware/auth.js'

export const achievementsRoutes = Router()
achievementsRoutes.get('/', allAchievementsController)
achievementsRoutes.get('/leaderboard', leaderboardController)
achievementsRoutes.get('/my', requireAuth, myAchievementsController)
achievementsRoutes.get('/progress', requireAuth, progressController)
achievementsRoutes.post('/check', requireAuth, checkController)
achievementsRoutes.post('/award/:code', requireAuth, awardController)
