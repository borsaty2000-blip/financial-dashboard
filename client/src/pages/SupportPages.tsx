import { useEffect, useState, type ReactNode } from 'react'
import { api } from '../lib/api'

type Article = {
	slug: string
	title: string
	category: string
	content: string
	tags?: string[]
}
type Ticket = {
	id: string
	ticketNumber: string
	subject: string
	status: string
	category: string
	messages?: { content: string; senderType: string }[]
}

function Shell({ title, children }: { title: string; children: ReactNode }) {
	return (
		<main className="page-container support-page">
			<div className="page-heading">
				<div>
					<span className="eyebrow">بورصتي Support</span>
					<h1>{title}</h1>
				</div>
				<a className="ghost-button light" href="/help">
					مركز المساعدة
				</a>
			</div>
			{children}
		</main>
	)
}

export function HelpPage({
	category,
	slug,
}: {
	category?: string
	slug?: string
}) {
	const [articles, setArticles] = useState<Article[]>([])
	const [article, setArticle] = useState<Article | null>(null)
	const [query, setQuery] = useState('')
	useEffect(() => {
		if (slug)
			void api<Article>(`/api/knowledge/articles/${slug}`)
				.then(setArticle)
				.catch(() => setArticle(null))
		else
			void api<Article[]>(
				`/api/knowledge/articles${category ? `?category=${encodeURIComponent(category)}` : ''}`,
			)
				.then(setArticles)
				.catch(() => setArticles([]))
	}, [category, slug])
	if (slug)
		return (
			<Shell title={article?.title ?? 'المقال غير موجود'}>
				{article ? (
					<article className="knowledge-article">
						<p>{article.content}</p>
						<button
							className="primary-button"
							onClick={() =>
								void api(`/api/knowledge/articles/${slug}/rate`, {
									method: 'POST',
									body: JSON.stringify({ helpful: true }),
								})
							}
						>
							كان مفيداً
						</button>
					</article>
				) : (
					<p className="empty-state">لم نعثر على المقال.</p>
				)}
			</Shell>
		)
	return (
		<Shell title={category ? `مساعدة: ${category}` : 'مركز المساعدة'}>
			<div className="support-search">
				<input
					value={query}
					onChange={(event) => setQuery(event.target.value)}
					placeholder="ابحث في 30 مقالاً..."
					onKeyDown={(event) => {
						if (event.key === 'Enter')
							void api<Article[]>(
								`/api/knowledge/search?q=${encodeURIComponent(query)}`,
							).then(setArticles)
					}}
				/>
				<a href="/support/tickets/new">فتح تذكرة</a>
			</div>
			<div className="knowledge-grid">
				{articles
					.filter((item) => !query || item.title.includes(query))
					.map((item) => (
						<a
							className="knowledge-card"
							href={`/help/article/${item.slug}`}
							key={item.slug}
						>
							<span>{item.category}</span>
							<h2>{item.title}</h2>
							<p>{item.content.slice(0, 120)}...</p>
						</a>
					))}
			</div>
		</Shell>
	)
}

export function SupportPage() {
	return (
		<Shell title="دعم العملاء">
			<div className="support-hero">
				<h2>كيف يمكننا مساعدتك؟</h2>
				<p>ابحث في مركز المساعدة أو أنشئ تذكرة وسيتابعها فريق الدعم.</p>
				<a className="primary-button" href="/support/tickets/new">
					إنشاء تذكرة جديدة
				</a>
			</div>
			<HelpPage />
		</Shell>
	)
}

export function TicketsPage({
	detail = false,
	create = false,
	id,
}: {
	detail?: boolean
	create?: boolean
	id?: string
}) {
	const [tickets, setTickets] = useState<Ticket[]>([])
	const [ticket, setTicket] = useState<Ticket | null>(null)
	const [subject, setSubject] = useState('')
	const [content, setContent] = useState('')
	const [message, setMessage] = useState('')
	useEffect(() => {
		if (detail && id)
			void api<Ticket>(`/api/support/tickets/${id}`)
				.then(setTicket)
				.catch(() => setTicket(null))
		else if (!create)
			void api<Ticket[]>('/api/support/tickets')
				.then(setTickets)
				.catch(() => setTickets([]))
	}, [detail, id, create])
	if (create)
		return (
			<Shell title="تذكرة جديدة">
				<form
					className="support-form"
					onSubmit={(event) => {
						event.preventDefault()
						void api('/api/support/tickets', {
							method: 'POST',
							body: JSON.stringify({ subject, category: 'OTHER', content }),
						}).then(() => {
							window.location.href = '/support/tickets'
						})
					}}
				>
					<input
						required
						value={subject}
						onChange={(event) => setSubject(event.target.value)}
						placeholder="موضوع التذكرة"
					/>
					<select defaultValue="OTHER">
						<option value="OTHER">أخرى</option>
						<option value="BUG">مشكلة تقنية</option>
						<option value="ACCOUNT">الحساب والأمان</option>
						<option value="FEATURE">اقتراح ميزة</option>
						<option value="BILLING">الفوترة</option>
					</select>
					<textarea
						required
						value={content}
						onChange={(event) => setContent(event.target.value)}
						placeholder="اشرح المشكلة بالتفصيل"
					/>
					<button className="primary-button">إرسال التذكرة</button>
				</form>
			</Shell>
		)
	if (detail)
		return (
			<Shell title={ticket?.subject ?? 'تفاصيل التذكرة'}>
				{ticket ? (
					<>
						<div className="ticket-meta">
							{ticket.ticketNumber} · {ticket.status}
						</div>
						<div className="ticket-thread">
							{ticket.messages?.map((item, index) => (
								<p key={index}>
									<b>{item.senderType}</b> {item.content}
								</p>
							))}
						</div>
						<form
							className="support-form inline"
							onSubmit={(event) => {
								event.preventDefault()
								void api(`/api/support/tickets/${id}/messages`, {
									method: 'POST',
									body: JSON.stringify({ content: message }),
								}).then(() => setMessage(''))
							}}
						>
							<input
								value={message}
								onChange={(event) => setMessage(event.target.value)}
								placeholder="أضف رسالة"
							/>
							<button className="primary-button">إرسال</button>
						</form>
					</>
				) : (
					<p className="empty-state">التذكرة غير موجودة.</p>
				)}
			</Shell>
		)
	return (
		<Shell title="تذاكري">
			<div className="page-heading">
				<a className="primary-button" href="/support/tickets/new">
					تذكرة جديدة
				</a>
			</div>
			<div className="ticket-list">
				{tickets.map((item) => (
					<a href={`/support/tickets/${item.id}`} key={item.id}>
						<b>{item.ticketNumber}</b>
						<span>{item.subject}</span>
						<em>{item.status}</em>
					</a>
				))}
			</div>
		</Shell>
	)
}
