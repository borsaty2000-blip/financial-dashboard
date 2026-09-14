import { prisma } from '../../lib/prisma.js'
import { getPortfolioValue } from '../trading.service.js'

export async function buildWeeklyDigest(userId: string) {
	const portfolio = await getPortfolioValue(userId).catch(() => null)
	const digest = {
		period: 'الأسبوع الحالي',
		portfolio,
		highlights: [
			'مراجعة أداء المحفظة الافتراضية',
			'مراجعة التنبيهات النشطة',
			'مراجعة الأسهم في قائمة المتابعة',
		],
		disclaimer: 'تقرير تعليمي مبني على البيانات المتاحة وليس توصية استثمارية.',
	}
	await prisma.notification
		.create({
			data: {
				userId,
				type: 'WEEKLY_DIGEST',
				title: 'تقرير بورصتي الأسبوعي',
				body: JSON.stringify(digest),
				link: '/weekly-report',
			},
		})
		.catch(() => undefined)
	return digest
}

export async function getWeeklyDigest(userId: string) {
	return buildWeeklyDigest(userId)
}
