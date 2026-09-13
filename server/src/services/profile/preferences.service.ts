import { prisma } from '../../lib/prisma.js'
import type { UpdatePreferencesInput } from '../../validators/preferences.validator.js'

const defaults = {
	preferredMarkets: [],
	experienceLevel: 'BEGINNER' as const,
	investmentStyle: 'BALANCED' as const,
	preferredSectors: [],
	dailyTimeCommitment: 'MEDIUM' as const,
}
export async function getPreferences(userId: string) {
	return prisma.userPreference.findUnique({ where: { userId } })
}
export async function updatePreferences(
	userId: string,
	data: UpdatePreferencesInput,
) {
	return prisma.userPreference.upsert({
		where: { userId },
		create: { userId, ...data },
		update: data,
	})
}

type SuggestedStock = { symbol: string; name: string }
const stockCatalog: Record<string, readonly SuggestedStock[]> = {
	EGX: [
		{ symbol: 'COMI', name: 'البنك التجاري الدولي' },
		{ symbol: 'ETEL', name: 'المصرية للاتصالات' },
		{ symbol: 'SWDY', name: 'السويدي إليكتريك' },
	],
	TASI: [
		{ symbol: '2222', name: 'أرامكو السعودية' },
		{ symbol: '1120', name: 'مصرف الراجحي' },
		{ symbol: '2010', name: 'سابك' },
	],
	METALS: [
		{ symbol: 'XAUUSD', name: 'الذهب' },
		{ symbol: 'XAGUSD', name: 'الفضة' },
	],
} as const
export async function getPersonalizedDashboard(userId: string) {
	const preferences = (await getPreferences(userId)) ?? defaults
	const markets = preferences.preferredMarkets.length
		? preferences.preferredMarkets
		: ['EGX', 'TASI']
	const suggestedStocks = markets
		.flatMap(
			(market) => stockCatalog[market as keyof typeof stockCatalog] ?? [],
		)
		.slice(0, 6)
	const recommendations = [
		{
			type: 'watchlist',
			title: 'حدّث قائمة المتابعة',
			description: `راجع أسهم ${markets.join(' و')} وفق أسلوبك ${preferences.investmentStyle}.`,
			priority: 'medium',
		},
		{
			type: 'learning',
			title:
				preferences.experienceLevel === 'BEGINNER'
					? 'ابدأ بأساسيات التحليل'
					: 'راجع التحليل الفني',
			description: 'استخدم المحتوى التعليمي قبل اتخاذ أي قرار.',
			priority: 'low',
		},
		...(preferences.dailyTimeCommitment === 'HIGH'
			? [
					{
						type: 'review',
						title: 'مراجعة يومية',
						description: 'خصص وقتاً لمقارنة أداء الأسهم التي تتابعها.',
						priority: 'medium',
					},
				]
			: []),
	]
	const news = markets.map((market) => ({
		market,
		topic: `أخبار وتقارير سوق ${market}`,
		available: false,
		message: 'سيتم عرض الأخبار عند توفر مصدر موثوق.',
	}))
	const alerts = [
		{
			type: 'preference',
			title: 'تنبيهات مخصصة',
			description: `التنبيهات مهيأة لأسواق ${markets.join(' و')} والقطاعات التي اخترتها.`,
			enabled: true,
		},
		{
			type: 'risk',
			title: 'تنبيه المخاطر',
			description:
				preferences.investmentStyle === 'GROWTH'
					? 'راجع التقلبات وحدد مستوى المخاطر قبل المتابعة.'
					: 'حافظ على تنويع المحفظة وراجع المخاطر دورياً.',
			enabled: true,
		},
	]
	return { preferences, recommendations, news, suggestedStocks, alerts }
}
