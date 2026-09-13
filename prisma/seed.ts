import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const achievements = [
	[
		'FIRST_LOGIN',
		'أول دخول',
		'First Login',
		'سجّل دخولك الأول إلى المنصة.',
		'🔑',
		'account',
		5,
	],
	[
		'PROFILE_COMPLETE',
		'ملف مكتمل',
		'Profile Complete',
		'أكمل بيانات ملفك الشخصي.',
		'👤',
		'account',
		10,
	],
	[
		'FIRST_WATCHLIST',
		'أول قائمة متابعة',
		'First Watchlist',
		'أضف أول سهم إلى قائمة المتابعة.',
		'⭐',
		'markets',
		10,
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
		'FIRST_STOCK_DETAIL',
		'قارئ الأسهم',
		'Stock Reader',
		'افتح صفحة تفاصيل سهم.',
		'📈',
		'markets',
		10,
	],
	[
		'COMPARE_TWO',
		'مقارنة أولى',
		'First Comparison',
		'قارن بين سهمين أو أكثر.',
		'⚖️',
		'analysis',
		15,
	],
	[
		'HEATMAP_EXPLORER',
		'خريطة السوق',
		'Heatmap Explorer',
		'استخدم خريطة السوق لاستكشاف الأسهم.',
		'🗺️',
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
		'TECHNICAL_READER',
		'قارئ فني',
		'Technical Reader',
		'راجع مؤشراً فنياً في صفحة سهم.',
		'📊',
		'analysis',
		20,
	],
	[
		'ELLIOTT_LEARNER',
		'متعلم Elliott',
		'Elliott Learner',
		'راجع تحليل Elliott Wave التعليمي.',
		'🌊',
		'learning',
		20,
	],
	[
		'GANN_LEARNER',
		'متعلم Gann',
		'Gann Learner',
		'راجع تحليل Gann التعليمي.',
		'📐',
		'learning',
		20,
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
		'LEARNING_START',
		'بداية التعلم',
		'Learning Starter',
		'ابدأ رحلة التعلم المالية.',
		'📚',
		'learning',
		15,
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
		'RISK_AWARE',
		'وعي المخاطر',
		'Risk Aware',
		'راجع تنبيه المخاطر قبل التداول الافتراضي.',
		'🛡️',
		'portfolio',
		15,
	],
	[
		'WEEKLY_READER',
		'قارئ التقرير',
		'Weekly Reader',
		'افتح تقريرك الأسبوعي.',
		'📝',
		'portfolio',
		10,
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
	[
		'COMMUNITY_MEMBER',
		'عضو المجتمع',
		'Community Member',
		'زر مساحة المجتمع.',
		'🤝',
		'community',
		10,
	],
	[
		'LEADERBOARD_VIEWER',
		'متابع المتصدرين',
		'Leaderboard Viewer',
		'استكشف ترتيب المتداولين الافتراضي.',
		'🏆',
		'community',
		10,
	],
	[
		'CONSISTENT_LEARNER',
		'متعلم مستمر',
		'Consistent Learner',
		'أكمل خمس خطوات تعليمية.',
		'🎓',
		'learning',
		30,
	],
] as const

async function main() {
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
}

main()
	.catch((error) => {
		console.error(error)
		process.exitCode = 1
	})
	.finally(() => prisma.$disconnect())
