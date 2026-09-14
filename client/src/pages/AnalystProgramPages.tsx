import { useEffect, useState } from 'react'
import { api } from '../lib/api'
export function AnalystProfilePage({ username }: { username: string }) {
	const [data, setData] = useState<any>(null)
	useEffect(() => {
		void api(`/api/analysts/${username}`)
			.then(setData)
			.catch(() => setData(null))
	}, [username])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Verified Analyst</p>
				<h1>{data?.displayName ?? data?.user?.fullName ?? username}</h1>
				<p>{data?.bio ?? 'ملف المحلل غير متاح حالياً.'}</p>
				<span>
					التقييم: {data?.rating ?? '—'} · مشتركون:{' '}
					{data?.totalSubscribers ?? 0}
				</span>
			</header>
			<section className="analysis-card analyst-posts">
				{(data?.posts ?? []).map((post: any) => (
					<article key={post.id}>
						<h2>{post.title}</h2>
						<small>
							{post.symbol ?? 'عام'} · {post.sentiment ?? 'NEUTRAL'} ·{' '}
							{post.isPremium ? 'Premium' : 'مجاني'}
						</small>
						<p>{post.content}</p>
					</article>
				))}
			</section>
		</main>
	)
}
export function AnalystDashboardPage() {
	const [profile, setProfile] = useState<any>(null)
	const [message, setMessage] = useState('')
	useEffect(() => {
		void api<any[]>('/api/analysts')
			.then((rows) => setProfile(rows[0] ?? null))
			.catch(() => undefined)
	}, [])
	async function publish() {
		try {
			await api('/api/analysts/posts', {
				method: 'POST',
				body: JSON.stringify({
					title: 'تحديث السوق',
					content: 'منشور تحليلي تعليمي جديد عن حركة السوق.',
					type: 'ANALYSIS',
				}),
			})
			setMessage('تم نشر المنشور')
		} catch {
			setMessage('يتطلب النشر اعتماد ملف المحلل')
		}
	}
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Analyst Studio</p>
				<h1>لوحة المحلل</h1>
				<p>إدارة الملف والمنشورات والاشتراكات.</p>
			</header>
			<section className="analysis-card">
				<b>{profile?.displayName ?? 'لم يتم اعتماد ملفك بعد'}</b>
				<button className="primary-button" onClick={() => void publish()}>
					نشر تحديث
				</button>
				{message && <p>{message}</p>}
			</section>
		</main>
	)
}
export function MySubscriptionsPage() {
	const [rows, setRows] = useState<any[]>([])
	useEffect(() => {
		void api<any[]>('/api/analysts/my/subscriptions')
			.then(setRows)
			.catch(() => setRows([]))
	}, [])
	return (
		<main className="analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Subscriptions</p>
				<h1>اشتراكاتي</h1>
			</header>
			<section className="analysis-card">
				{rows.length ? (
					rows.map((item) => (
						<div className="tool-row" key={item.id}>
							<b>{item.analyst?.fullName ?? item.analyst?.username}</b>
							<span>{item.price ?? 0} شهرياً</span>
							<span>{item.status}</span>
						</div>
					))
				) : (
					<p>لا توجد اشتراكات نشطة.</p>
				)}
			</section>
		</main>
	)
}
