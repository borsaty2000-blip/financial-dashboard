import { navigate } from '../router'

type ActivitySection = {
	key: string
	label: string
	description: string
	links: Array<{ label: string; path: string }>
}

const sections: ActivitySection[] = [
	{
		key: 'markets',
		label: 'مركز الأسواق',
		description:
			'تابع المؤشرات، الأدلة، السلع والأسواق الإضافية من مساحة واحدة.',
		links: [
			{ label: 'EGX', path: '/markets/egx' },
			{ label: 'TASI', path: '/markets/tasi' },
			{ label: 'خريطة السوق', path: '/heatmap' },
			{ label: 'فاحص الأسهم', path: '/screener' },
			{ label: 'الذهب والفضة', path: '/markets/commodities' },
		],
	},
	{
		key: 'analysis',
		label: 'مختبر التحليل',
		description:
			'حوّل حركة السعر إلى فرضية قابلة للفحص عبر المؤشرات والموجات والاختبار التاريخي.',
		links: [
			{ label: 'Elliott Wave', path: '/analysis/elliott' },
			{ label: 'Gann', path: '/analysis/gann' },
			{ label: 'Backtest', path: '/backtest' },
			{ label: 'مقارنة الأسهم', path: '/compare' },
		],
	},
	{
		key: 'news',
		label: 'غرفة الأخبار',
		description: 'اقرأ الأخبار المرتبطة بالأسواق والسلع مع رابط المصدر الأصلي.',
		links: [
			{ label: 'كل الأخبار', path: '/news' },
			{ label: 'التقويم الاقتصادي', path: '/calendar' },
			{ label: 'أحداث الأرباح', path: '/calendar/earnings' },
			{ label: 'التوزيعات', path: '/calendar/dividends' },
		],
	},
	{
		key: 'learn',
		label: 'مسار التعلم',
		description:
			'تعلم قراءة السوق وإدارة المخاطر قبل الانتقال إلى أدوات التحليل.',
		links: [
			{ label: 'الأكاديمية', path: '/education' },
			{ label: 'مكتبة الفيديو', path: '/videos' },
			{ label: 'الندوات', path: '/webinars' },
			{ label: 'المجتمع', path: '/community' },
		],
	},
	{
		key: 'workspace',
		label: 'مساحة العمل',
		description:
			'نظّم ما تتابعه، واختبر أفكارك، وراجع أداء المحاكاة التعليمية.',
		links: [
			{ label: 'قوائم المتابعة', path: '/watchlists' },
			{ label: 'التنبيهات', path: '/alerts' },
			{ label: 'المحفظة الافتراضية', path: '/portfolio' },
			{ label: 'التقرير الأسبوعي', path: '/weekly-report' },
		],
	},
	{
		key: 'general',
		label: 'مركز borsatyai',
		description: 'انتقل بسرعة بين الأسواق والتحليل والأخبار والتعلم.',
		links: [
			{ label: 'الأسواق', path: '/markets/egx' },
			{ label: 'التحليل', path: '/analysis/elliott' },
			{ label: 'الأخبار', path: '/news' },
			{ label: 'التعلم', path: '/education' },
		],
	},
]

const sectionForPath = (path: string) => {
	if (path.startsWith('/markets') || path === '/screener') return sections[0]
	if (
		path.startsWith('/analysis') ||
		path === '/backtest' ||
		path === '/candlestick' ||
		path.startsWith('/compare') ||
		path.startsWith('/strateg')
	)
		return sections[1]
	if (path === '/news' || path.startsWith('/calendar')) return sections[2]
	if (
		path.startsWith('/education') ||
		path === '/learning' ||
		path.startsWith('/videos') ||
		path === '/webinars' ||
		path.startsWith('/community')
	)
		return sections[3]
	if (
		path === '/portfolio' ||
		path.startsWith('/watchlists') ||
		path.startsWith('/alerts') ||
		path.startsWith('/weekly-report')
	)
		return sections[4]
	return sections[5]
}

export function SectionActivityBar({ path }: { path: string }) {
	if (
		path === '/login' ||
		path === '/register' ||
		path.startsWith('/reset-password') ||
		path === '/forgot-password' ||
		path.startsWith('/settings') ||
		path.startsWith('/developer')
	)
		return null
	const section = sectionForPath(path)
	return (
		<section className="section-activity-bar" aria-label={section.label}>
			<div className="section-activity-copy">
				<span className="section-activity-kicker">
					borsatyai · {section.key}
				</span>
				<strong>{section.label}</strong>
				<p>{section.description}</p>
			</div>
			<nav
				className="section-activity-links"
				aria-label={`روابط ${section.label}`}
			>
				{section.links.map((link) => (
					<button
						key={link.path}
						type="button"
						onClick={() => navigate(link.path)}
					>
						{link.label}
						<span aria-hidden="true">←</span>
					</button>
				))}
			</nav>
		</section>
	)
}
