import { prisma } from '../../lib/prisma.js'

const actionToCode: Record<string, string> = {
	USER_REGISTERED: 'FIRST_LOGIN',
	PROFILE_COMPLETED: 'PROFILE_COMPLETE',
	WATCHLIST_CREATED: 'FIRST_WATCHLIST',
	ALERT_CREATED: 'FIRST_ALERT',
	ELLIOTT_USED_50: 'WAVE_MASTER',
	GANN_USED_50: 'GANN_EXPERT',
	LOGIN_STREAK_7: 'DAILY_VISITOR',
	LOGIN_STREAK_30: 'LOYAL_USER',
	PORTFOLIO_CREATED: 'INVESTOR',
	PORTFOLIO_PROFIT_10: 'SMART_INVESTOR',
	POST_CREATED: 'SOCIAL_BUTTERFLY',
	FOLLOWERS_100: 'INFLUENCER',
	BORSATY_MASTER: 'BORSATY_MASTER',
}
export function calculateLevel(xp: number) {
	return {
		xp,
		level: Math.floor(xp / 100) + 1,
		title: ['مبتدئ', 'متوسط', 'متقدم', 'محترف', 'خبير'][
			Math.min(4, Math.floor(xp / 100))
		],
	}
}
export async function getAllAchievements() {
	return prisma.achievement.findMany({
		orderBy: [{ category: 'asc' }, { points: 'asc' }],
	})
}
export async function getUserAchievements(userId: string) {
	return prisma.userAchievement.findMany({
		where: { userId },
		include: { achievement: true },
		orderBy: { completedAt: 'desc' },
	})
}
export async function getAchievementProgress(userId: string) {
	const [all, mine] = await Promise.all([
		getAllAchievements(),
		getUserAchievements(userId),
	])
	const progress = new Map(mine.map((item) => [item.achievementId, item]))
	const xp = mine
		.filter((item) => item.completed)
		.reduce((sum, item) => sum + item.achievement.points, 0)
	return {
		achievements: all.map((achievement) => ({
			...achievement,
			progress: progress.get(achievement.id)?.progress ?? 0,
			completed: progress.get(achievement.id)?.completed ?? false,
			completedAt: progress.get(achievement.id)?.completedAt ?? null,
		})),
		...calculateLevel(xp),
	}
}
export async function awardAchievement(userId: string, code: string) {
	const achievement = await prisma.achievement.findUnique({ where: { code } })
	if (!achievement) return null
	return prisma.userAchievement.upsert({
		where: { userId_achievementId: { userId, achievementId: achievement.id } },
		update: { progress: 100, completed: true, completedAt: new Date() },
		create: {
			userId,
			achievementId: achievement.id,
			progress: 100,
			completed: true,
			completedAt: new Date(),
		},
		include: { achievement: true },
	})
}
export async function checkAndAward(userId: string, action: string) {
	const code = actionToCode[action]
	if (!code) return { awarded: false, action }
	const result = await awardAchievement(userId, code)
	return { awarded: Boolean(result), action, code, achievement: result }
}
export async function getLeaderboard(limit = 10) {
	const users = await prisma.user.findMany({
		where: { isActive: true },
		select: {
			id: true,
			username: true,
			fullName: true,
			avatarUrl: true,
			achievements: {
				where: { completed: true },
				include: { achievement: { select: { points: true } } },
			},
		},
	})
	return users
		.map((user) => ({
			id: user.id,
			username: user.username,
			fullName: user.fullName,
			avatarUrl: user.avatarUrl,
			...calculateLevel(
				user.achievements.reduce(
					(sum, item) => sum + item.achievement.points,
					0,
				),
			),
		}))
		.sort((a, b) => b.xp - a.xp)
		.slice(0, Math.min(10, Math.max(1, limit)))
		.map((user, index) => ({ rank: index + 1, ...user }))
}
