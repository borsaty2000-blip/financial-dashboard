import { PrismaClient } from '@prisma/client'
import {
	educationCatalog,
	lessonTemplates,
} from '../server/src/services/education/catalog.js'
import { knowledgeCatalog } from '../server/src/services/support/knowledge.catalog.js'
import {
	currencyCatalog,
	marketCatalog,
} from '../server/src/services/regional/regional.service.js'

const prisma = new PrismaClient()

const achievements = [
	[
		'FIRST_LOGIN',
		'أول دخول',
		'First Login',
		'سجّل دخولك الأول إلى المنصة.',
		'🔑',
		'account',
		10,
	],
	[
		'PROFILE_COMPLETE',
		'ملف مكتمل',
		'Profile Complete',
		'أكمل بيانات ملفك الشخصي.',
		'👤',
		'account',
		25,
	],
	[
		'FIRST_WATCHLIST',
		'أول قائمة متابعة',
		'First Watchlist',
		'أضف أول سهم إلى قائمة المتابعة.',
		'⭐',
		'markets',
		20,
	],
	[
		'FIRST_ALERT',
		'أول تنبيه',
		'First Alert',
		'أنشئ أول تنبيه للسوق.',
		'🔔',
		'markets',
		15,
	],
	[
		'WAVE_MASTER',
		'خبير Elliott',
		'Wave Master',
		'استخدم تحليل Elliott Wave خمسين مرة.',
		'🌊',
		'analysis',
		100,
	],
	[
		'GANN_EXPERT',
		'خبير Gann',
		'Gann Expert',
		'استخدم تحليل Gann خمسين مرة.',
		'📐',
		'analysis',
		100,
	],
	[
		'DAILY_VISITOR',
		'زائر يومي',
		'Daily Visitor',
		'حافظ على سلسلة دخول سبعة أيام.',
		'📅',
		'account',
		25,
	],
	[
		'LOYAL_USER',
		'مستخدم وفي',
		'Loyal User',
		'حافظ على سلسلة دخول ثلاثين يوماً.',
		'🏅',
		'account',
		100,
	],
	[
		'INVESTOR',
		'مستثمر',
		'Investor',
		'أنشئ أول محفظة استثمارية.',
		'💼',
		'portfolio',
		50,
	],
	[
		'SMART_INVESTOR',
		'مستثمر ذكي',
		'Smart Investor',
		'حقق ربحاً افتراضياً بنسبة 10%.',
		'🧠',
		'portfolio',
		100,
	],
	[
		'SOCIAL_BUTTERFLY',
		'فراشة اجتماعية',
		'Social Butterfly',
		'أنشئ أول منشور في المجتمع.',
		'🦋',
		'community',
		25,
	],
	[
		'INFLUENCER',
		'مؤثر',
		'Influencer',
		'احصل على مئة متابع.',
		'📣',
		'community',
		100,
	],
	[
		'BORSATY_MASTER',
		'خبير بورصتي',
		'Borsaty Master',
		'أكمل رحلة التعلم والإنجازات الأساسية.',
		'🎓',
		'learning',
		500,
	],
	[
		'MARKET_EXPLORER',
		'مستكشف الأسواق',
		'Market Explorer',
		'تصفح أسواق EGX وTASI والمعادن.',
		'🧭',
		'markets',
		15,
	],
	[
		'STOCK_READER',
		'قارئ الأسهم',
		'Stock Reader',
		'افتح صفحة تفاصيل سهم.',
		'📈',
		'markets',
		10,
	],
	[
		'COMPARATOR',
		'مقارن الأسهم',
		'Stock Comparator',
		'قارن بين سهمين أو أكثر.',
		'⚖️',
		'analysis',
		15,
	],
	[
		'SCREENER_USER',
		'باحث الأسهم',
		'Screener User',
		'نفّذ أول عملية فحص للأسهم.',
		'🔎',
		'analysis',
		15,
	],
	[
		'NEWS_READER',
		'متابع الأخبار',
		'News Reader',
		'اقرأ أول خبر سوق.',
		'📰',
		'learning',
		10,
	],
	[
		'PAPER_TRADER',
		'متداول افتراضي',
		'Paper Trader',
		'نفّذ أول عملية شراء افتراضية.',
		'🎮',
		'portfolio',
		20,
	],
	[
		'SHARIAH_CHECK',
		'فحص شرعي',
		'Shariah Check',
		'راجع حالة سهم في الفحص الشرعي.',
		'☪️',
		'values',
		15,
	],
] as const

async function main() {
	await prisma.achievement.deleteMany({
		where: { code: { notIn: achievements.map(([code]) => code) } },
	})
	for (const [
		code,
		nameAr,
		nameEn,
		description,
		icon,
		category,
		points,
	] of achievements) {
		await prisma.achievement.upsert({
			where: { code },
			update: { nameAr, nameEn, description, icon, category, points },
			create: { code, nameAr, nameEn, description, icon, category, points },
		})
	}
	console.log(`Seeded ${achievements.length} achievements.`)
	for (const courseData of educationCatalog) {
		const existing = await prisma.course.findFirst({
			where: { title: courseData.title },
		})
		const course = existing
			? await prisma.course.update({
					where: { id: existing.id },
					data: { ...courseData, isPublished: true },
				})
			: await prisma.course.create({
					data: { ...courseData, isPublished: true },
				})
		for (const lessonData of lessonTemplates(course.title)) {
			await prisma.lesson.upsert({
				where: { id: `${course.id}-${lessonData.order}` },
				update: lessonData,
				create: {
					id: `${course.id}-${lessonData.order}`,
					courseId: course.id,
					...lessonData,
				},
			})
		}
	}
	for (const category of [
		['general', 'نقاش عام', 'General', '💬', 1],
		['egx', 'البورصة المصرية', 'EGX', '🇪🇬', 2],
		['tasi', 'السوق السعودي', 'TASI', '🇸🇦', 3],
		['education', 'التعلم والتحليل', 'Learning', '📚', 4],
	] as const) {
		await prisma.forumCategory.upsert({
			where: { id: category[0] },
			update: {
				name: category[1],
				nameEn: category[2],
				icon: category[3],
				order: category[4],
			},
			create: {
				id: category[0],
				name: category[1],
				nameEn: category[2],
				icon: category[3],
				order: category[4],
			},
		})
	}
	for (const article of knowledgeCatalog) {
		await prisma.knowledgeArticle.upsert({
			where: { slug: article.slug },
			update: {
				title: article.title,
				content: article.content,
				category: article.category,
				tags: article.tags,
				isPublished: true,
			},
			create: {
				slug: article.slug,
				title: article.title,
				content: article.content,
				category: article.category,
				tags: article.tags,
				isPublished: true,
			},
		})
	}
	for (const market of marketCatalog) {
		await prisma.market.upsert({
			where: { code: market.code },
			update: {
				name: market.name,
				nameEn: market.nameEn,
				nameAr: market.name,
				country: market.country,
				currency: market.currency,
				timezone: market.timezone,
				regulator: market.regulator,
				isActive: market.active,
				workingDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
				tradingHours: { open: '10:00', close: '15:00' },
			},
			create: {
				code: market.code,
				name: market.name,
				nameEn: market.nameEn,
				nameAr: market.name,
				country: market.country,
				currency: market.currency,
				timezone: market.timezone,
				regulator: market.regulator,
				isActive: market.active,
				workingDays: ['SUN', 'MON', 'TUE', 'WED', 'THU'],
				tradingHours: { open: '10:00', close: '15:00' },
			},
		})
	}
	for (const currency of currencyCatalog) {
		await prisma.currency.upsert({
			where: { code: currency.code },
			update: { name: currency.name, symbol: currency.symbol, isActive: true },
			create: {
				code: currency.code,
				name: currency.name,
				symbol: currency.symbol,
				isActive: true,
			},
		})
	}
	console.log(
		`Seeded ${educationCatalog.length} courses, ${knowledgeCatalog.length} help articles, and regional catalogs.`,
	)
}

main()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
