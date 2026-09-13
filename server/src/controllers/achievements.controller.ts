import type { Request, Response } from 'express'
import {
	awardAchievement,
	checkAndAward,
	getAchievementProgress,
	getAllAchievements,
	getLeaderboard,
	getUserAchievements,
} from '../services/profile/achievements.service.js'
import { checkAchievementSchema } from '../validators/achievements.validator.js'

const sendError = (res: Response, error: unknown) =>
	res.status(400).json({
		error: error instanceof Error ? error.message : 'تعذر تنفيذ طلب الإنجاز',
	})
export async function allAchievementsController(_req: Request, res: Response) {
	try {
		res.json({ achievements: await getAllAchievements() })
	} catch (error) {
		sendError(res, error)
	}
}
export async function myAchievementsController(req: Request, res: Response) {
	try {
		res.json({ achievements: await getUserAchievements(req.userId!) })
	} catch (error) {
		sendError(res, error)
	}
}
export async function progressController(req: Request, res: Response) {
	try {
		res.json(await getAchievementProgress(req.userId!))
	} catch (error) {
		sendError(res, error)
	}
}
export async function checkController(req: Request, res: Response) {
	try {
		const input = checkAchievementSchema.parse(req.body)
		res.json(await checkAndAward(req.userId!, input.action))
	} catch (error) {
		sendError(res, error)
	}
}
export async function leaderboardController(req: Request, res: Response) {
	try {
		const limit = Number(req.query.limit ?? 10)
		res.json({
			leaderboard: await getLeaderboard(Number.isFinite(limit) ? limit : 10),
		})
	} catch (error) {
		sendError(res, error)
	}
}
export async function awardController(req: Request, res: Response) {
	try {
		const result = await awardAchievement(req.userId!, req.params.code)
		if (!result) return res.status(404).json({ error: 'الإنجاز غير موجود' })
		res.json({ achievement: result })
	} catch (error) {
		sendError(res, error)
	}
}
