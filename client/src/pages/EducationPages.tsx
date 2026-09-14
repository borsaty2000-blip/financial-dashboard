import { useEffect, useState } from 'react'
import { api } from '../lib/api'

type Course = {
	id: string
	title: string
	titleEn?: string
	description: string
	level: string
	category: string
	duration: number
	price: number
	isFree: boolean
	rating?: number
	totalStudents?: number
	lessons?: Lesson[]
	_count?: { lessons: number; enrollments: number }
}
type Lesson = {
	id: string
	title: string
	content: string
	duration: number
	order: number
}

const levelLabel: Record<string, string> = {
	BEGINNER: 'مبتدئ',
	INTERMEDIATE: 'متوسط',
	ADVANCED: 'متقدم',
}
export function EducationPage({
	mode = 'catalog',
	id = '',
}: {
	mode?: 'catalog' | 'course' | 'lesson' | 'my' | 'certificates'
	id?: string
}) {
	const [courses, setCourses] = useState<Course[]>([])
	const [course, setCourse] = useState<Course | null>(null)
	const [lesson, setLesson] = useState<Lesson | null>(null)
	const [data, setData] = useState<any>(null)
	const [loading, setLoading] = useState(true)
	const [message, setMessage] = useState('')
	useEffect(() => {
		setLoading(true)
		const path =
			mode === 'catalog'
				? '/api/courses'
				: mode === 'course'
					? `/api/courses/${id}`
					: mode === 'lesson'
						? `/api/lessons/${id}`
						: mode === 'my'
							? '/api/my/courses'
							: '/api/my/certificates'
		void api<any>(path)
			.then((value) => {
				if (mode === 'catalog') setCourses(value)
				else if (mode === 'course') setCourse(value)
				else if (mode === 'lesson') setLesson(value)
				else setData(value)
			})
			.catch(() => setMessage('سجّل الدخول للوصول إلى مسارك التعليمي'))
			.finally(() => setLoading(false))
	}, [mode, id])
	async function enroll(courseId: string) {
		try {
			await api(`/api/courses/${courseId}/enroll`, { method: 'POST' })
			setMessage('تم التسجيل في الدورة بنجاح')
		} catch {
			setMessage('يتطلب التسجيل الدخول إلى الحساب')
		}
	}
	async function complete(lessonId: string) {
		try {
			await api(`/api/lessons/${lessonId}/complete`, { method: 'POST' })
			setMessage('تم حفظ تقدمك')
		} catch {
			setMessage('تعذر حفظ التقدم')
		}
	}
	if (loading)
		return (
			<main className="education-page analysis-page">
				<div className="loading-screen">جارٍ تحميل المحتوى التعليمي...</div>
			</main>
		)
	if (mode === 'course' && course)
		return (
			<main className="education-page analysis-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Borsaty Academy</p>
					<h1>{course.title}</h1>
					<p>{course.description}</p>
				</header>
				<section className="education-hero-card">
					<span>{levelLabel[course.level] ?? course.level}</span>
					<strong>{course.isFree ? 'مجانية' : `${course.price} USD`}</strong>
					<button
						className="primary-button"
						onClick={() => void enroll(course.id)}
					>
						ابدأ الدورة
					</button>
				</section>
				<section className="education-lesson-list">
					{(course.lessons ?? []).map((item) => (
						<article key={item.id} className="analysis-card">
							<div>
								<span>الدرس {item.order}</span>
								<h3>{item.title}</h3>
								<small>{item.duration} دقيقة</small>
							</div>
							<a
								className="secondary-button"
								href={`/education/${course.id}/lessons/${item.id}`}
							>
								فتح الدرس
							</a>
						</article>
					))}
				</section>
				{message && <p className="inline-message">{message}</p>}
			</main>
		)
	if (mode === 'lesson' && lesson)
		return (
			<main className="education-page analysis-page" dir="rtl">
				<a href="/education">← العودة إلى الأكاديمية</a>
				<header className="page-heading">
					<p className="eyebrow">درس تعليمي</p>
					<h1>{lesson.title}</h1>
					<p>{lesson.duration} دقيقة</p>
				</header>
				<article className="analysis-card lesson-content">
					<p>{lesson.content}</p>
					<button
						className="primary-button"
						onClick={() => void complete(lesson.id)}
					>
						علّمت الدرس كمكتمل
					</button>
				</article>
				{message && <p className="inline-message">{message}</p>}
			</main>
		)
	if (mode === 'my' || mode === 'certificates')
		return (
			<main className="education-page analysis-page" dir="rtl">
				<header className="page-heading">
					<p className="eyebrow">Borsaty Academy</p>
					<h1>{mode === 'my' ? 'دوراتي' : 'شهاداتي'}</h1>
				</header>
				<section className="education-grid">
					{(data ?? []).map((item: any) => (
						<article className="analysis-card" key={item.id}>
							<h3>{item.course?.title ?? item.courseId ?? 'شهادة بورصتي'}</h3>
							<p>
								{item.progress != null
									? `التقدم ${item.progress}%`
									: `رمز التحقق: ${item.verificationCode}`}
							</p>
						</article>
					))}
				</section>
			</main>
		)
	return (
		<main className="education-page analysis-page" dir="rtl">
			<header className="page-heading">
				<p className="eyebrow">Borsaty Academy</p>
				<h1>أكاديمية بورصتي</h1>
				<p>
					تعلم التحليل المالي خطوة بخطوة، مع محتوى تعليمي واضح وليس توصية
					استثمارية.
				</p>
			</header>
			<section className="education-grid">
				{courses.map((item) => (
					<article
						className="analysis-card education-course-card"
						key={item.id}
					>
						<div className="course-badge">
							{item.isFree ? 'مجاني' : `${item.price} USD`}
						</div>
						<h2>{item.title}</h2>
						<p>{item.description}</p>
						<div className="course-meta">
							<span>{levelLabel[item.level] ?? item.level}</span>
							<span>{item.duration} دقيقة</span>
							<span>
								{item._count?.lessons ?? item.lessons?.length ?? 0} دروس
							</span>
						</div>
						<a className="primary-button" href={`/education/${item.id}`}>
							عرض الدورة
						</a>
					</article>
				))}
			</section>
		</main>
	)
}
