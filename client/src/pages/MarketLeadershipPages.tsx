import { useEffect, useState } from 'react'
import { api } from '../lib/api'

export function CommunityPage({
	mode = 'home',
	id = '',
}: {
	mode?: 'home' | 'topic' | 'leaderboard'
	id?: string
}) {
	const [topics, setTopics] = useState<any[]>([])
	const [categories, setCategories] = useState<any[]>([])
	const [detail, setDetail] = useState<any>(null)
	useEffect(() => {
		if (mode === 'topic')
			void api(`/api/forum/topics/${id}`)
				.then(setDetail)
				.catch(() => undefined)
		else if (mode === 'leaderboard')
			void api('/api/reputation/leaderboard')
				.then((value) => setTopics(value as any[]))
				.catch(() => undefined)
		else
			void Promise.all([
				api<any[]>('/api/forum/topics'),
				api<any[]>('/api/forum/categories'),
			])
				.then(([a, b]) => {
					setTopics(a)
					setCategories(b)
				})
				.catch(() => undefined)
	}, [mode, id])
	if (mode === 'topic' && detail)
		return (
			<main className="analysis-page leadership-page" dir="rtl">
				<a href="/community">← العودة للمجتمع</a>
				<article className="analysis-card">
					<p className="eyebrow">{detail.category?.name ?? 'منتدى'}</p>
					<h1>{detail.title}</h1>
					<p>{detail.content}</p>
					<div className="community-replies">
						{detail.replies?.map((reply: any) => (
							<div className="reply-card" key={reply.id}>
								<strong>{reply.user?.fullName ?? reply.user?.username}</strong>
								<p>{reply.content}</p>
								<span>{reply.likes ?? 0} إعجاب</span>
							</div>
						))}
					</div>
				</article>
			</main>
		)
	if (mode === 'leaderboard')
		return (
			<main className="analysis-page leadership-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Community Reputation</p>
					<h1>متصدرو المجتمع</h1>
				</header>
				<section className="education-grid">
					{topics.map((item: any, index) => (
						<article className="analysis-card" key={item.userId ?? index}>
							<strong>
								#{index + 1}{' '}
								{item.user?.fullName ?? item.user?.username ?? 'عضو'}
							</strong>
							<p>
								{item.points ?? 0} نقطة · {item.acceptedAnswers ?? 0} إجابة
								مقبولة
							</p>
						</article>
					))}
				</section>
			</main>
		)
	return (
		<main className="analysis-page leadership-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Community</p>
				<h1>مجتمع بورصتي</h1>
				<p>
					ناقش الأسواق وتبادل المعرفة باحترام، دون تحويل النقاش إلى توصيات
					شخصية.
				</p>
			</header>
			<section className="education-grid">
				{categories.map((item) => (
					<article className="analysis-card" key={item.id}>
						<h3>
							{item.icon} {item.name}
						</h3>
						<p>نقاشات وتحليلات تعليمية</p>
					</article>
				))}
			</section>
			<section className="analysis-card">
				<h2>أحدث النقاشات</h2>
				{topics.map((item) => (
					<a
						className="community-topic"
						href={`/community/topics/${item.id}`}
						key={item.id}
					>
						<strong>{item.title}</strong>
						<span>
							{item.replyCount ?? 0} ردود · {item.views ?? 0} مشاهدة
						</span>
					</a>
				))}
			</section>
			<a className="primary-button" href="/community/new">
				إنشاء موضوع
			</a>
			<a className="secondary-button" href="/community/leaderboard">
				متصدرو المجتمع
			</a>
		</main>
	)
}

export function VideoLibraryPage({
	webinars = false,
	id = '',
}: {
	webinars?: boolean
	id?: string
}) {
	const [items, setItems] = useState<any[]>([])
	const [detail, setDetail] = useState<any>(null)
	useEffect(() => {
		void api<any>(
			id ? `/api/videos/${id}` : webinars ? '/api/webinars' : '/api/videos',
		)
			.then((value) => (id ? setDetail(value) : setItems(value)))
			.catch(() => undefined)
	}, [webinars, id])
	if (id && detail)
		return (
			<main className="analysis-page leadership-page" dir="rtl">
				<a href="/videos">← العودة للمكتبة</a>
				<article className="analysis-card">
					<h1>{detail.title}</h1>
					<p>{detail.description}</p>
					<a className="primary-button" href={detail.url}>
						تشغيل الفيديو
					</a>
				</article>
			</main>
		)
	return (
		<main className="analysis-page leadership-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Media</p>
				<h1>{webinars ? 'الندوات القادمة' : 'مكتبة الفيديو'}</h1>
			</header>
			<section className="education-grid">
				{items.map((item) => (
					<article className="analysis-card" key={item.id}>
						<span className="course-badge">{item.category ?? item.status}</span>
						<h2>{item.title}</h2>
						<p>{item.description}</p>
						{webinars ? (
							<p>
								{new Date(item.scheduledAt).toLocaleString('ar-EG-u-nu-latn')}
							</p>
						) : (
							<a className="primary-button" href={`/videos/${item.id}`}>
								مشاهدة
							</a>
						)}
					</article>
				))}
			</section>
		</main>
	)
}

export function EnterprisePage() {
	const [sent, setSent] = useState(false)
	return (
		<main className="analysis-page leadership-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Enterprise</p>
				<h1>حلول المؤسسات</h1>
				<p>
					تحليلات السوق وبرامج التعليم وواجهات API للجامعات والأكاديميات ومديري
					الأصول.
				</p>
			</header>
			<section className="education-grid">
				{[
					'نطاق وهوية مخصصة',
					'إدارة فرق وصلاحيات',
					'API بحدود مؤسسية',
					'تقارير وتحليلات مخصصة',
					'SLA ودعم مخصص',
				].map((item) => (
					<article className="analysis-card" key={item}>
						<h3>{item}</h3>
						<p>تخطيط قابل للتخصيص بحسب احتياج المؤسسة.</p>
					</article>
				))}
			</section>
			{sent ? (
				<p className="inline-message">
					تم استلام طلب التواصل. سنراجع البيانات عند ربط الحساب.
				</p>
			) : (
				<button className="primary-button" onClick={() => setSent(true)}>
					تقديم طلب تواصل
				</button>
			)}
		</main>
	)
}

export function ReferralPage() {
	const [data, setData] = useState<any>(null)
	const [code, setCode] = useState('')
	const [message, setMessage] = useState('')
	useEffect(() => {
		void api('/api/referrals')
			.then(setData)
			.catch(() => setMessage('سجّل الدخول لإدارة الإحالات'))
	}, [])
	async function apply() {
		try {
			await api('/api/referrals/apply', {
				method: 'POST',
				body: JSON.stringify({ code }),
			})
			setMessage('تم تطبيق الكود')
		} catch {
			setMessage('الكود غير صالح')
		}
	}
	const share =
		typeof navigator !== 'undefined' && navigator.share
			? () =>
					void navigator.share({
						title: 'بورصتي',
						text: 'انضم إلى بورصتي',
						url: `${location.origin}/register?ref=${data?.code?.code ?? ''}`,
					})
			: undefined
	return (
		<main className="analysis-page leadership-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Growth Program</p>
				<h1>برنامج الإحالة</h1>
				<p>
					كل إحالة ناجحة تمنح 50 رصيداً تعليمياً. عند 10 إحالات تحصل على شهر
					Premium تعليمي.
				</p>
			</header>
			<section className="metric-grid">
				<div>
					<span>كودك</span>
					<strong>{data?.code?.code ?? '—'}</strong>
				</div>
				<div>
					<span>الإحالات</span>
					<strong>{data?.total ?? 0}</strong>
				</div>
				<div>
					<span>الأرصدة</span>
					<strong>{data?.reward ?? 0}</strong>
				</div>
			</section>
			<section className="analysis-card">
				<button className="primary-button" onClick={share}>
					مشاركة الدعوة
				</button>
				<h2>لديك كود؟</h2>
				<input
					value={code}
					onChange={(event) => setCode(event.target.value)}
					placeholder="BORSATY-XXXX"
				/>
				<button className="secondary-button" onClick={() => void apply()}>
					تطبيق الكود
				</button>
			</section>
			{message && <p className="inline-message">{message}</p>}
		</main>
	)
}

export function BlogPage({ slug = '' }: { slug?: string }) {
	const [posts, setPosts] = useState<any[]>([])
	const [post, setPost] = useState<any>(null)
	useEffect(() => {
		void api<any>(slug ? `/api/blog/${slug}` : '/api/blog')
			.then((value) => (slug ? setPost(value) : setPosts(value)))
			.catch(() => undefined)
	}, [slug])
	if (slug && post)
		return (
			<main className="analysis-page leadership-page" dir="rtl">
				<article className="analysis-card blog-article">
					<p className="eyebrow">Borsaty Insights</p>
					<h1>{post.title}</h1>
					<p>{post.excerpt}</p>
					<div className="blog-content">{post.content}</div>
					<script
						type="application/ld+json"
						dangerouslySetInnerHTML={{
							__html: JSON.stringify({
								'@context': 'https://schema.org',
								'@type': 'Article',
								headline: post.title,
								description: post.seoDescription ?? post.excerpt,
								datePublished: post.publishedAt,
							}),
						}}
					/>
				</article>
			</main>
		)
	return (
		<main className="analysis-page leadership-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Insights</p>
				<h1>المدونة</h1>
				<p>مقالات تعليمية عن الأسواق والتحليل وإدارة المخاطر.</p>
			</header>
			<section className="education-grid">
				{posts.map((item) => (
					<article className="analysis-card" key={item.id}>
						<h2>{item.title}</h2>
						<p>{item.excerpt}</p>
						<a className="primary-button" href={`/blog/${item.slug}`}>
							اقرأ المقال
						</a>
					</article>
				))}
			</section>
		</main>
	)
}
